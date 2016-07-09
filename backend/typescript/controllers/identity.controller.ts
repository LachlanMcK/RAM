import {Router, Request, Response} from 'express';
import {security} from './security.middleware';
import {sendResource, sendError, sendNotFoundError, validateReqSchema, sendSearchResult} from './helpers';
import {Headers} from './headers';
import {conf} from '../bootstrap';
import {IIdentityModel} from '../models/identity.model';

export class IdentityController {

    constructor(private identityModel:IIdentityModel) {
    }

    //LM: I'm not sure what this is doing.  I can't see where it does the "find".  I can't see where model comes from.
    private findMe = async (req:Request, res:Response) => {
        const identity = res.locals[Headers.Identity];
        const schema = {};
        validateReqSchema(req, schema)
            .then((req:Request) => identity ? identity : null)
            .then((model) => model ? model.toDTO() : null)
            .then(sendResource(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    private findByIdentityIdValue = async (req:Request, res:Response) => {
        const schema = {
            'idValue': {
                in: 'params',
                notEmpty: true,
                errorMessage: 'Id Value is not valid'
            }
        };
        validateReqSchema(req, schema)
            .then((req:Request) => this.identityModel.findByIdValue(req.params.idValue))
            .then((model) => model ? model.toDTO() : null)
            .then(sendResource(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    private findPendingByInvitationCodeInDateRange = async (req:Request, res:Response) => {
        const schema = {
            'invitationCode': {
                notEmpty: true,
                errorMessage: 'Invitation Code is not valid'
            }
        };
        validateReqSchema(req, schema)
            .then((req:Request) => this.identityModel.findPendingByInvitationCodeInDateRange(req.params.invitationCode, new Date()))
            .then((model) => model ? model.toDTO() : null)
            .then(sendResource(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    //LM: I'm not sure what you have in minde for this search.
    private search = async (req:Request, res:Response) => {
        const schema = {
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
            },
        };
        validateReqSchema(req, schema)
            .then((req:Request) => this.identityModel.search(req.query.page, req.query.pageSize))
            .then((results) => (results.map((model) => model.toHrefValue(true))))
            .then(sendSearchResult(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    public assignRoutes = (router:Router) => {

        router.get('/v1/identity/me',
            security.isAuthenticated,
            this.findMe);

        router.get('/v1/identity/:idValue',
            security.isAuthenticated,
            this.findByIdentityIdValue);

        router.get('/v1/identity/invitationCode/:invitationCode',
            security.isAuthenticated,
            this.findPendingByInvitationCodeInDateRange);
        
        //LM: is really a good idea?
        if (conf.devMode) {
            router.get('/v1/identities', this.search);
        }

        return router;

    };

}
