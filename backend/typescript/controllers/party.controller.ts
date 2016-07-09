import {Router, Request, Response} from 'express';
import {security} from './security.middleware';
import {sendResource, sendError, sendNotFoundError, validateReqSchema} from './helpers';
import {Headers} from './headers';
import {IPartyModel} from '../models/party.model';

export class PartyController {

    constructor(private partyModel:IPartyModel) {
    }

    //LM: why not just set findMe to be find by id value?  they are the same execpt for the validation - and why don't we want the validation?
    private findMe = async (req:Request, res:Response) => {
        const identity = res.locals[Headers.Identity];
        const schema = {};
        validateReqSchema(req, schema)
            .then((req:Request) => identity ? this.partyModel.findByIdentityIdValue(identity.idValue) : null)
            .then((model) => model ? model.toDTO() : null)
            .then(sendResource(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    private findByIdentityIdValue = (req:Request, res:Response) => {
        const schema = {
            'idValue': {
                in: 'params',
                notEmpty: true,
                errorMessage: 'Id Value is not valid'
            }
        };
        validateReqSchema(req, schema)
            .then((req:Request) => this.partyModel.findByIdentityIdValue(req.params.idValue))
            .then((model) => model ? model.toDTO() : null)
            .then(sendResource(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    public assignRoutes = (router:Router) => {

        router.get('/v1/party/identity/me',
            security.isAuthenticated,
            this.findMe);

        router.get('/v1/party/identity/:idValue',
            security.isAuthenticated,
            this.findByIdentityIdValue);

        return router;

    };

}