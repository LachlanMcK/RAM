import * as mongoose from 'mongoose';
import {RAMEnum, IRAMObject, RAMSchema} from './base';
import {IIdentity, IdentityModel} from './identity.model';
import {
    HrefValue,
    Party as DTO,
    Identity as IdentityDTO,
    RelationshipAddDTO
} from '../../../commons/RamAPI';
import {RelationshipModel, RelationshipStatus, IRelationship} from './relationship.model';
import {RelationshipTypeModel} from './relationshipType.model';
import {RelationshipAttributeModel, IRelationshipAttribute} from './relationshipAttribute.model';
import {RelationshipAttributeNameModel} from './relationshipAttributeName.model';

// enums, utilities, helpers ..........................................................................................

export class PartyType extends RAMEnum {

    //LM: I don't believe we should see ABN hardcoded in like this.
    //LM: I'm not sure why we need to know party type at all.  I understand the UI needs to work out how it should render based on 
    //LM: ABN lookup vs Name/DOB capture.  But the backend shouldn't care.
    public static ABN = new PartyType('ABN');
    public static Individual = new PartyType('INDIVIDUAL');

    protected static AllValues = [
        PartyType.ABN,
        PartyType.Individual,
    ];

    constructor(name:string) {
        super(name);
    }
}

// schema .............................................................................................................

const PartySchema = RAMSchema({
    partyType: {
        type: String,
        required: [true, 'Party Type is required'],
        trim: true,
        enum: PartyType.valueStrings()
    }
});

// interfaces .........................................................................................................

export interface IParty extends IRAMObject {
    partyType:string;
    partyTypeEnum():PartyType;
    //LM: wouldn't we want to generalise this for everything, hence move to IRAMObject??
    toHrefValue(includeValue:boolean):Promise<HrefValue<DTO>>;
    toDTO():Promise<DTO>;
    addRelationship(dto:RelationshipAddDTO):Promise<IRelationship>;
}

/* tslint:disable:no-empty-interfaces */
export interface IPartyModel extends mongoose.Model<IParty> {
    findByIdentityIdValue:(idValue:string) => Promise<IParty>;
}

// instance methods ...................................................................................................

PartySchema.method('partyTypeEnum', function () {
    return PartyType.valueOf(this.partyType);
});

//LM: Does mongoose allow us to specify the return type?
PartySchema.method('toHrefValue', async function (includeValue:boolean) {
    //LM: I would have thought a find default party would return a party object (which contains Identities, one of which is default), rather than just return a defaultIdentity
    const defaultIdentity = await IdentityModel.findDefaultByPartyId(this.id);
    if (defaultIdentity) {
        return new HrefValue(
            '/api/v1/party/identity/' + defaultIdentity.idValue,
            includeValue ? await this.toDTO() : undefined
        );
    } else {
        throw new Error('Default Identity not found');
    }
});

PartySchema.method('toDTO', async function () {
    const identities = await IdentityModel.listByPartyId(this.id);
    return new DTO(
        this.partyType,
        await Promise.all<HrefValue<IdentityDTO>>(identities.map(
            async (identity:IIdentity) => {
                return await identity.toHrefValue(false);
            }))
    );
});

/**
 * Creates a relationship to a temporary identity (InvitationCode) until the invitiation has been accepted, whereby
 * the relationship will be transferred to the authorised identity.
 */
//LM:  I felt compelled to add a bit more info
/**
 * Creates a relationship to a temporary Party (which can be found using an identity with an InvitationCode), until 
 * the invitiation has been accepted, whereby either:  
 * -- the relationship will be transferred to the Party record for the logged on user (if they are already known) or 
 * -- the temporary Party will be retained as a permanent record for the logged on user (who claims the Relationship with the 
 *    invitation code) because is new and did not have a party record.  To become a permanent record for the user, the user's 
 *    credential information will be attached to the Party record.    
 * party will become the 
 */
//LM: I've got to confess, this seems like it should belong in relationship.model.ts rather than here.
/* tslint:disable:max-func-body-length */
PartySchema.method('addRelationship', async (dto:RelationshipAddDTO) => {

    // TODO improve handling of lookups that return null outside of the date range

    // lookups
    const relationshipType = await RelationshipTypeModel.findByCodeInDateRange(dto.relationshipType, new Date());

    //LM: in general you can't assume the new party is the delegate.  We want to also allow delegates to invite subjects to relationships.
    const subjectIdentity = await IdentityModel.findByIdValue(dto.subjectIdValue);

    // create the temp identity for the invitation code
    const temporaryDelegateIdentity = await IdentityModel.createFromDTO(dto.delegate);

    const attributes:IRelationshipAttribute[] = [];

    for (let attr of dto.attributes) {
        const attributeName = await RelationshipAttributeNameModel.findByCodeInDateRange(attr.code, new Date());
        if (attributeName) {
            attributes.push(await RelationshipAttributeModel.create({
                value: attr.value,
                attributeName: attributeName
            }));
        }
    }

    // create the relationship
    const relationship = await RelationshipModel.create({
        relationshipType: relationshipType,
        subject: subjectIdentity.party,
        subjectNickName: subjectIdentity.profile.name,
        delegate: temporaryDelegateIdentity.party,
        delegateNickName: temporaryDelegateIdentity.profile.name,
        startTimestamp: dto.startTimestamp,
        endTimestamp: dto.endTimestamp,
        status: RelationshipStatus.Pending.name,
        attributes: attributes
    });

    return relationship;

});

// static methods .....................................................................................................

PartySchema.static('findByIdentityIdValue', async(idValue:string) => {
    const identity = await IdentityModel.findByIdValue(idValue);
    return identity ? identity.party : null;
});

// concrete model .....................................................................................................

export const PartyModel = mongoose.model(
    'Party',
    PartySchema) as IPartyModel;