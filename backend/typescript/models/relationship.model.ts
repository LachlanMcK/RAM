import * as mongoose from 'mongoose';
import {RAMEnum, IRAMObject, RAMSchema, Query} from './base';
import {IParty, PartyModel} from './party.model';
import {IName, NameModel} from './name.model';
import {IRelationshipType} from './relationshipType.model';
import {IRelationshipAttribute, RelationshipAttributeModel} from './relationshipAttribute.model';
import {IdentityModel, IIdentity, IdentityType, IdentityInvitationCodeStatus} from './identity.model';
import {
    HrefValue,
    Relationship as DTO,
    RelationshipAttribute as RelationshipAttributeDTO,
    SearchResult
} from '../../../commons/RamAPI';

// force schema to load first (see https://github.com/atogov/RAM/pull/220#discussion_r65115456)

/* tslint:disable:no-unused-variable */
const _PartyModel = PartyModel;

/* tslint:disable:no-unused-variable */
const _NameModel = NameModel;

/* tslint:disable:no-unused-variable */
const _RelationshipAttributeModel = RelationshipAttributeModel;

//LM: why limit this to just relationships?
const MAX_PAGE_SIZE = 10;

// enums, utilities, helpers ..........................................................................................

//LM: why not use this at the front end as well? Or is it availble to the f/e through statusEnum?
export class RelationshipStatus extends RAMEnum {

    public static Active = new RelationshipStatus('ACTIVE');
    public static Cancelled = new RelationshipStatus('CANCELLED');
    public static Deleted = new RelationshipStatus('DELETED');
    public static Invalid = new RelationshipStatus('INVALID');
    public static Pending = new RelationshipStatus('PENDING');

    protected static AllValues = [
        RelationshipStatus.Active,
        RelationshipStatus.Cancelled,
        RelationshipStatus.Deleted,
        RelationshipStatus.Invalid,
        RelationshipStatus.Pending
    ];

    constructor(name:string) {
        super(name);
    }
}

// schema .............................................................................................................

const RelationshipSchema = RAMSchema({
    relationshipType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RelationshipType',
        required: [true, 'Relationship Type is required']
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Party',
        required: [true, 'Subject is required']
    },
    //LM: why not make nicknames optional?  When not supplied just use the party's "default" identity
    subjectNickName: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Name',
        required: [true, 'Subject Nick Name is required']
    },
    delegate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Party',
        required: [true, 'Subject is required']
    },
    delegateNickName: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Name',
        required: [true, 'Delegate Nick Name is required']
    },
    startTimestamp: {
        type: Date,
        required: [true, 'Start Timestamp is required']
    },
    endTimestamp: {
        type: Date,
        set: function (value:String) {
            if (value) {
                this.endEventTimestamp = new Date();
            }
            return value;
        }
    },
    endEventTimestamp: {
        type: Date,
        required: [function () {
            return this.endTimestamp;
        }, 'End Event Timestamp is required']
    },
    status: {
        type: String,
        required: [true, 'Status is required'],
        trim: true,
        enum: RelationshipStatus.valueStrings()
    },
    attributes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RelationshipAttribute'
    }]
});

// interfaces .........................................................................................................

//LM: Do we want to store the Party HRef string here (well above in the schema)?
//LM: I'm happy for the answer to be, no not yet, leave it to optimisation - if required.
//LM: ...but I wonder if you want a method to do that look-up
export interface IRelationship extends IRAMObject {
    relationshipType:IRelationshipType;
    subject:IParty;
    subjectNickName:IName;
    delegate:IParty;
    delegateNickName:IName;
    startTimestamp:Date;
    endTimestamp?:Date;
    endEventTimestamp?:Date;
    status:string;
    attributes:IRelationshipAttribute[];
    statusEnum():RelationshipStatus;
    toHrefValue(includeValue:boolean):Promise<HrefValue<DTO>>;
    toDTO():Promise<DTO>;
    acceptPendingInvitation(acceptingDelegateIdentity:IIdentity):Promise<IRelationship>;
    rejectPendingInvitation():void;
    notifyDelegate(email:string):Promise<IRelationship>;
}

export interface IRelationshipModel extends mongoose.Model<IRelationship> {
    findByIdentifier:(id:string) => Promise<IRelationship>;
    //LM: I don't know why we just find the pending Invitation code.  We can't return this info to the frontend.  
    findPendingByInvitationCodeInDateRange:(invitationCode:string, date:Date) => Promise<IRelationship>;
    search:(subjectIdentityIdValue:string, delegateIdentityIdValue:string, page:number, pageSize:number)
        => Promise<SearchResult<IRelationship>>;
}

// instance methods ...................................................................................................

RelationshipSchema.method('statusEnum', function () {
    return RelationshipStatus.valueOf(this.status);
});

RelationshipSchema.method('toHrefValue', async function (includeValue:boolean) {
    const relationshipId:string = this._id.toString();
    return new HrefValue(
        `/api/v1/relationship/${relationshipId}`,
        includeValue ? await this.toDTO() : undefined
    );
});

RelationshipSchema.method('toDTO', async function () {
    return new DTO(
        await this.relationshipType.toHrefValue(false),
        await this.subject.toHrefValue(true),
        await this.subjectNickName.toDTO(),
        await this.delegate.toHrefValue(true),
        await this.delegateNickName.toDTO(),
        this.startTimestamp,
        this.endTimestamp,
        this.endEventTimestamp,
        this.status,
        await Promise.all<RelationshipAttributeDTO>(this.attributes.map(
            async(attribute:IRelationshipAttribute) => {
                return await attribute.toDTO();
            }))
    );
});

RelationshipSchema.method('acceptPendingInvitation', async function (acceptingDelegateIdentity:IIdentity) {

    if (this.statusEnum() === RelationshipStatus.Pending) {

        // TODO need to match identity details, validate identity and credentials strengths (not spec'ed out yet)

        //LM: invitation codes may be given to subjects
        //LM: I'm curious how the relationship was found.  I would have thought the process
        //LM: would go the other way, find the party with the invitation code, then find the relationships it
        //LM: participates in.

        // mark claimed with timestamp on the temporary delegate identity
        const identities = await IdentityModel.listByPartyId(this.delegate.id);
        for (let identity of identities) {
            if (identity.identityTypeEnum() === IdentityType.InvitationCode &&
                identity.invitationCodeStatusEnum() === IdentityInvitationCodeStatus.Pending) {
                //LM: why set the status to the status's name and not just the code?
                identity.invitationCodeStatus = IdentityInvitationCodeStatus.Claimed.name;
                identity.invitationCodeClaimedTimestamp = new Date();
                //LM: the user claiming the code may already have a party record, so need to move the invitation code to their identity
                //LM: and re-point this relationship to that party and destroy the temporary party. 
                await identity.save();
            }
        }

        // mark relationship as active
        // point relationship to the accepting delegate identity
        this.status = RelationshipStatus.Active.name;
        this.delegate = acceptingDelegateIdentity.party;
        await this.save();

        // TODO notify relevant parties

        return Promise.resolve(this);

    } else {
        throw new Error('Unable to accept a non-pending relationship');
    }
});

RelationshipSchema.method('rejectPendingInvitation', async function () {

    if (this.statusEnum() === RelationshipStatus.Pending) {

        // mark relationship as invalid
        this.status = RelationshipStatus.Invalid.name;
        await this.save();

        // as relationship doesn't have a pointer to the identity, this rejects all invitation identities
        // associated with the temporary delegate (there should only be one)
        //LM: see comments against accepting invitaiton code
        const identities = await IdentityModel.listByPartyId(this.delegate.id);
        for (let identity of identities) {
            if (identity.identityTypeEnum() === IdentityType.InvitationCode &&
                identity.invitationCodeStatusEnum() === IdentityInvitationCodeStatus.Pending) {
                identity.invitationCodeStatus = IdentityInvitationCodeStatus.Rejected.name;
                await identity.save();
            }
        }

        // TODO notify relevant parties

    } else {
        throw new Error('Unable to reject a non-pending relationship');
    }

});

RelationshipSchema.method('notifyDelegate', async function (email:string) {

    if (this.statusEnum() === RelationshipStatus.Pending) {

        //LM: I don't get this!
        // save email
        // as relationship doesn't have a pointer to the identity, this sets email on all invitation identities
        // associated with the temporary delegate (there should only be one)
        const identities = await IdentityModel.listByPartyId(this.delegate.id);
        for (let identity of identities) {
            if (identity.identityTypeEnum() === IdentityType.InvitationCode &&
                identity.invitationCodeStatusEnum() === IdentityInvitationCodeStatus.Pending) {
                identity.invitationCodeTemporaryEmailAddress = email;
                await identity.save();
            }
        }

        // TODO notify relevant parties

        return Promise.resolve(this);
    } else {
        throw new Error('Unable to update relationship with delegate email');
    }

});

// RelationshipSchema.method('identitiesByTypeAndStatus', async function (identityType:IdentityType, status:IdentityInvitationCodeStatus) {
//      const identities = await IdentityModel.listByPartyId(this.delegate.id);
//     return identities.filter((identity) => identity.identityTypeEnum() === identityType
//             && identity.invitationCodeStatusEnum() === status)
// });

// static methods .....................................................................................................

//LM: I wouldn't have thought this method would ever get used as there is no way to know the "id" (except as the result of a previous list)
//LM: --so OK it could be used, but is there any point?  I don't think we should be returning the id to the outside world, so they can't come back with it. 
RelationshipSchema.static('findByIdentifier', (id:string) => {
    // TODO migrate from _id to another id
    return this.RelationshipModel
        .findOne({
            _id: id
        })
        .deepPopulate([
            'relationshipType',
            'subject',
            'subjectNickName',
            'delegate',
            'delegateNickName',
            'attributes.attributeName'
        ])
        .exec();
});

RelationshipSchema.static('findPendingByInvitationCodeInDateRange', async(invitationCode:string, date:Date) => {
    //LM: this makes sense, except we shouldn't assume the invitation code was given to the delegate.
    //LM: we might want to remember in the invitation code whether it was given to the subject or delegate
    //LM: there is no point just finding the IC, we have to do something with it once it is found.
    const identity = await IdentityModel.findPendingByInvitationCodeInDateRange(invitationCode, date);
    if (identity) {
        const delegate = identity.party;
        return this.RelationshipModel
            .findOne({
                delegate: delegate
            })
            .deepPopulate([
                'relationshipType',
                'subject',
                'subjectNickName',
                'delegate',
                'delegateNickName',
                'attributes.attributeName'
            ])
            .exec();
    }
    return null;
});

//LM: OK, I don't understand this mongo stuff, but I would have expected the relationship type as part of the search criteria. 
RelationshipSchema.static('search', (subjectIdentityIdValue:string, delegateIdentityIdValue:string, page:number, reqPageSize:number) => {
    return new Promise<SearchResult<IRelationship>>(async(resolve, reject) => {
        const pageSize:number = reqPageSize ? Math.min(reqPageSize, MAX_PAGE_SIZE) : MAX_PAGE_SIZE;
        try {
            const query = await (new Query()
                .when(subjectIdentityIdValue, 'subject', () => PartyModel.findByIdentityIdValue(subjectIdentityIdValue))
                .when(delegateIdentityIdValue, 'delegate', () => PartyModel.findByIdentityIdValue(delegateIdentityIdValue))
                .build());
            const count = await this.RelationshipModel
                .count(query)
                .exec();
            const list = await this.RelationshipModel
                .find(query)
                .deepPopulate([
                    'relationshipType',
                    'subject',
                    'subjectNickName',
                    'delegate',
                    'delegateNickName',
                    'attributes.attributeName'
                ])
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .sort({name: 1})
                .exec();
            resolve(new SearchResult<IRelationship>(count, pageSize, list));
        } catch (e) {
            reject(e);
        }
    });
});

// concrete model .....................................................................................................

export const RelationshipModel = mongoose.model(
    'Relationship',
    RelationshipSchema) as IRelationshipModel;