import {Router, Request, Response} from 'express';
import {Headers} from './headers';

export class AuthenticatorSimulatorController {

    private authenticate = async (req:Request, res:Response) => {
        const authToken = req.body.credentials;
        if (authToken) {
            const authTokenEncoded = new Buffer(authToken).toString('base64');
            const maxAge = 24 * 60 * 60 * 1000;
            res.status(200);
            res.cookie(Headers.AuthToken, authTokenEncoded, {maxAge: maxAge, path: '/'});
            res.send({token: authTokenEncoded});
        } else {
            res.status(401);
            res.set('WWW-Authenticate', '/api/v1/simulators/authenticate');
            res.clearCookie(Headers.AuthToken);
            res.send({token: null});
        }
    };

    private showMe = async (req:Request, res:Response) => {
        res.status(200);
        res.send(res.locals);
    };

    public assignRoutes = (router:Router) => {
        router.post('/v1/simulators/authenticators/authenticate', this.authenticate);
        router.get('/v1/simulators/authenticators/me', this.showMe);
        return router;
    };

}
