import {Router, Request, Response} from 'express';
import {sendResource, sendList, sendError, sendNotFoundError, validateReqSchema} from './helpers';
import {IHrefValue} from '../../../commons/RamAPI';
import {IRelationshipType} from '../models/relationshipType.model';
import {IRelationshipTypeModel } from '../models/relationshipType.model';
import {IRelationshipType as IRelationshipTypeDTO} from '../../../commons/RamAPI';
import {IRelationshipAttributeName as IRelationshipAttributeNameDTO} from '../../../commons/RamAPI';
import {IRelationshipAttributeNameUsage as IRelationshipAttributeNameUsageDTO} from '../../../commons/RamAPI';

export class RelationshipTypeController {

    constructor(private relationshipTypeModel: IRelationshipTypeModel) {
    }

    private mapToIHrefValue = (relationshipType:IRelationshipType):IHrefValue<IRelationshipTypeDTO> => {
        if (relationshipType) {
            return {
                href: '/api/v1/relationshipType/' + relationshipType.code,
                value: this.mapToResponseObject(relationshipType)
            };
        }
        return null;
    };

    private mapToResponseObject = (relationshipType:IRelationshipType):IRelationshipTypeDTO => {
        if (relationshipType) {
            return {
                code: relationshipType.code,
                shortDecodeText: relationshipType.shortDecodeText,
                longDecodeText: relationshipType.longDecodeText,
                startTimestamp: relationshipType.startDate,
                endTimestamp: relationshipType.endDate,
                voluntaryInd: relationshipType.voluntaryInd,
                relationshipAttributeNames: relationshipType.attributeNameUsages.map((attributeNameUsage) => {
                    return {
                        mandatory: !attributeNameUsage.optionalInd,
                        defaultValue: attributeNameUsage.defaultValue,
                        attributeNameDef: {
                            href: '/api/v1/relationshipAttributeName/' + attributeNameUsage.attributeName.code,
                            value: {
                                code: attributeNameUsage.attributeName.code,
                                shortDecodeText: attributeNameUsage.attributeName.shortDecodeText,
                                longDecodeText: attributeNameUsage.attributeName.longDecodeText,
                                startTimestamp: attributeNameUsage.attributeName.startDate,
                                endTimestamp: attributeNameUsage.attributeName.endDate,
                                name: attributeNameUsage.attributeName.shortDecodeText,
                                domain: attributeNameUsage.attributeName.domain,
                                permittedValues: attributeNameUsage.attributeName.permittedValues
                            } as IRelationshipAttributeNameDTO
                        } as IHrefValue<IRelationshipAttributeNameDTO>
                    } as IRelationshipAttributeNameUsageDTO;
                })
            } as IRelationshipTypeDTO;
        }
        return null;
    };

    private findByCodeIgnoringDateRange = async (req: Request, res: Response) => {
        const schema = {
            'code': {
                notEmpty: true,
                errorMessage: 'Code is not valid'
            }
        };
        validateReqSchema(req, schema)
            .then((req:Request) => this.relationshipTypeModel.findByCodeIgnoringDateRange(req.params.code))
            .then(this.mapToResponseObject)
            .then(sendResource(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    private listIgnoringDateRange = async (req: Request, res: Response) => {
        const schema = {};
        validateReqSchema(req, schema)
            .then((req:Request) => this.relationshipTypeModel.listIgnoringDateRange())
            .then((results) => results ? results.map(this.mapToIHrefValue) : null)
            .then(sendList(res), sendError(res))
            .then(sendNotFoundError(res));
    };

    public assignRoutes = (router: Router) => {
        router.get('/v1/relationshipType/:code', this.findByCodeIgnoringDateRange);
        router.get('/v1/relationshipTypes', this.listIgnoringDateRange);
        return router;
    };

}
