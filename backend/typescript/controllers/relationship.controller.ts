import {Router, Request, Response} from 'express';
import {security} from './security.middleware';
import {
    sendError, sendNotFoundError, validateReqSchema, sendResource, sendSearchResult, REGULAR_CHARS
} from './helpers';
import {IRelationshipModel} from '../models/relationship.model';
import {RelationshipAddDTO, CreateIdentityDTO, AttributeDTO} from '../../../commons/RamAPI';
import {PartyModel} from '../models/party.model';
import {ProfileProvider} from '../models/profile.model';
import {IdentityType} from '../models/identity.model';

// todo add data security
export class RelationshipController {

    constructor(private relationshipModel:IRelationshipModel) {
    }

    private findByIdentifier = async(req:Request, res:Response) => {
        const schema = {
            'identifier': {
                in: 'params',
                notEmpty: true,
                errorMessage: 'Identifier is not valid'
            }
        };
        validateReqSchema(req, schema)
            .then((req:Request) => this.relationshipModel.findByIdentifier(req.params.identifier))
            .then((model) => model ? model.toDTO() : null)
            .then(sendResource(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    private findPendingByInvitationCodeInDateRange = async(req:Request, res:Response) => {
        const schema = {
            'invitationCode': {
                notEmpty: true,
                errorMessage: 'Invitation Code is not valid'
            }
        };
        validateReqSchema(req, schema)
            .then((req:Request) => this.relationshipModel.findPendingByInvitationCodeInDateRange(req.params.invitationCode, new Date()))
            .then((model) => model ? model.toDTO() : null)
            .then(sendResource(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    private acceptByInvitationCode = async(req:Request, res:Response) => {
        const schema = {
            'invitationCode': {
                notEmpty: true,
                errorMessage: 'Invitation Code is not valid'
            }
        };
        validateReqSchema(req, schema)
            .then((req:Request) => this.relationshipModel.findPendingByInvitationCodeInDateRange(req.params.invitationCode, new Date()))
            .then((model) => model ? model.acceptPendingInvitation(security.getAuthenticatedIdentity(res)) : null)
            .then((model) => model ? model.toDTO() : null)
            .then(sendResource(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    private rejectByInvitationCode = async(req:Request, res:Response) => {
        const schema = {
            'invitationCode': {
                notEmpty: true,
                errorMessage: 'Invitation Code is not valid'
            }
        };
        validateReqSchema(req, schema)
            .then((req:Request) => this.relationshipModel.findPendingByInvitationCodeInDateRange(req.params.invitationCode, new Date()))
            .then((model) => model ? model.rejectPendingInvitation() : null)
            .then((model) => model ? Promise.resolve({}) : null)
            .then(sendResource(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    private notifyDelegate = async(req:Request, res:Response) => {
        const schema = {
            'invitationCode': {
                notEmpty: true,
                errorMessage: 'Invitation Code is not valid'
            },
            'email': {
                in: 'body',
                notEmpty: true,
                isEmail: {
                    errorMessage: 'Email is not valid'
                },
                errorMessage: 'Email is not supplied'
            }
        };

        validateReqSchema(req, schema)
            .then((req:Request) => this.relationshipModel.findPendingByInvitationCodeInDateRange(req.params.invitationCode, new Date()))
            .then((model) => model ? model.notifyDelegate(req.body.email) : null)
            .then((model) => model ? model.toDTO() : null)
            .then(sendResource(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    /* tslint:disable:max-func-body-length */
    private listBySubjectOrDelegate = async(req:Request, res:Response) => {
        const schema = {
            'subject_or_delegate': {
                in: 'params',
                notEmpty: true,
                errorMessage: 'Subject Or Delegate is not valid',
                matches: {
                    options: ['^(subject|delegate)$'],
                    errorMessage: 'Subject Or Delegate is not valid'
                }
            },
            'identity_id': {
                in: 'params',
                notEmpty: true,
                errorMessage: 'Identity Id is not valid'
            },
            'page': {
                in: 'query',
                notEmpty: true,
                isNumeric: {
                    errorMessage: 'Page is not valid'
                }
            },
            'pageSize': {
                in: 'query',
                optional: true,
                isNumeric: {
                    errorMessage: 'Page Size is not valid'
                }
            }
        };
        validateReqSchema(req, schema)
            .then((req:Request) => this.relationshipModel.search(
                req.params.subject_or_delegate === 'subject' ? req.params.identity_id : null,
                req.params.subject_or_delegate === 'delegate' ? req.params.identity_id : null,
                req.query.page,
                req.query.pageSize)
            )
            .then((results) => (results.map((model) => model.toHrefValue(true))))
            .then(sendSearchResult(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    //LM: why would it matter to a relationship what kind of party it is? 
    private create = async(req:Request, res:Response) => {
        // TODO support other party types - currently only INDIVIDUAL is supported here
        // TODO how much of this validation should be in the data layer?
        // TODO decide how to handle dates - should they include time? or should server just use 12am AEST
        const schemaB2I = {
            'relationshipType': {
                in: 'body',
                notEmpty: true,
                errorMessage: 'Relationship type is not valid'
            },
            'subjectIdValue': {
                in: 'body',
                notEmpty: true,
                errorMessage: 'Subject is not valid'
            },
            'startTimestamp': {
                in: 'body',
                notEmpty: true,
                isDate: {
                    errorMessage: 'Start timestamp is not valid'
                },
                errorMessage: 'Start timestamp is not valid'
            },
            'endTimestamp': {
                in: 'body'
            },
            //LM: what is the delegate.<stuff> ?
            'delegate.partyType': {
                in: 'body',
                matches: {
                    options: ['^(INDIVIDUAL)$'],
                    errorMessage: 'Delegate Party Type is not valid'
                }
            },
            'delegate.givenName': {
                in: 'body',
                notEmpty: true,
                isLength: {
                    options: [{min: 1, max: 200}],
                    errorMessage: 'Delegate Given Name must be between 1 and 200 chars long'
                },
                matches: {
                    options: [REGULAR_CHARS],
                    errorMessage: 'Delegate Given Name contains illegal characters'
                },
                errorMessage: 'Delegate Given Name is not valid'
            },
            'delegate.familyName': {
                in: 'body',
                optional: true,
                isLength: {
                    options: [{min: 0, max: 200}],
                    errorMessage: 'Delegate Family Name must be between 0 and 200 chars long'
                },
                matches: {
                    options: [REGULAR_CHARS],
                    errorMessage: 'Delegate Family Name contains illegal characters'
                },
                errorMessage: 'Delegate Family Name is not valid'
            },
            'delegate.sharedSecretTypeCode': {
                in: 'body',
                notEmpty: true,
                matches: {
                    options: ['^(DATE_OF_BIRTH)$'],
                    errorMessage: 'Delegate Shared Secret Type Code is not valid'
                }
            },
            'delegate.sharedSecretValue': {
                in: 'body'
            }
        };

        validateReqSchema(req, schemaB2I)
            .then((req:Request) => {
                return PartyModel.findByIdentityIdValue(req.body.subjectIdValue);
            })
            .then((subjectParty) => {
                const relationshipAddDTO = new RelationshipAddDTO(
                    req.body.relationshipType,
                    req.body.subjectIdValue,
                    new CreateIdentityDTO(
                        undefined,
                        req.body.delegate.partyType,
                        req.body.delegate.givenName,
                        req.body.delegate.familyName,
                        req.body.delegate.unstructuredName,
                        req.body.delegate.sharedSecretTypeCode,
                        req.body.delegate.sharedSecretValue,
                        IdentityType.InvitationCode.name,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        ProfileProvider.Temp.name
                    ),
                    req.body.startTimestamp ? new Date(req.body.startTimestamp) : undefined,
                    req.body.endTimestamp ? new Date(req.body.endTimestamp) : undefined,
                    AttributeDTO.build(req.body.attributes)
                );
                return subjectParty.addRelationship(relationshipAddDTO);
            })
            .then((model) => model ? model.toDTO() : null)
            .then(sendResource(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    public assignRoutes = (router:Router) => {

        //LM: I note none of these conform to the what is documented in data-types.ts
        //    I expected just two get APIs, a get with the full rel id, i.e. a delegate & subject party (this is close to 
        //          but the identifier is a multi part field) 
        //    & a "list/search" using just one party & a bunch of filter
        //    
        //    The invitation code is about a party
        //   
        //    /v1/relationship/invitationCode/:invitationCode/accept etc do not comply with standards as there is no "accept" data concept
        //    instead we should just be doing a PUT with status code of accept/reject... and we respond appropriately  
        // 
        router.get('/v1/relationship/:identifier',
            security.isAuthenticated,
            this.findByIdentifier);

        //LM: I'd like to discuss this
        router.get('/v1/relationship/invitationCode/:invitationCode',
            security.isAuthenticated,
            this.findPendingByInvitationCodeInDateRange);

        router.post('/v1/relationship/invitationCode/:invitationCode/accept',
            security.isAuthenticated,
            this.acceptByInvitationCode);

        router.post('/v1/relationship/invitationCode/:invitationCode/reject',
            security.isAuthenticated,
            this.rejectByInvitationCode);

        router.post('/v1/relationship/invitationCode/:invitationCode/notifyDelegate',
            security.isAuthenticated,
            this.notifyDelegate);

        router.get('/v1/relationships/:subject_or_delegate/identity/:identity_id',
            security.isAuthenticated,
            this.listBySubjectOrDelegate);

        router.post('/v1/relationship',
            security.isAuthenticated,
            this.create);

        return router;

    };
}
