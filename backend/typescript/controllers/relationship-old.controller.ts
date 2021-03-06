import {sendDocument, sendError, sendNotFoundError} from './helpers';
import {Router, Request, Response} from 'express';
import {
  IRelationship, statusOptions, accessLevels, IRelationshipModel
} from '../models/relationship-old.model';
import {
  IPartyModel
} from '../models/party-old.model';
import * as mongoose from 'mongoose';

// Todo: DelegateOrSubject to become Enum so it is then type checked

type QueryRelationship = {
  deleted: boolean,
  subjectId?: mongoose.Types.ObjectId,
  delegateId?: mongoose.Types.ObjectId
};

class PaginationParams {
  constructor(public pageSize: number,
    public pageNo: number,
    public delegateOrSubject: string,
    public id: mongoose.Types.ObjectId) { }
}

export class RelationshipController {
  constructor(private relationshipModel: IRelationshipModel,
    private partyModel: IPartyModel) { }
  private createQueryObject(delegateOrSubject: string, id: mongoose.Types.ObjectId): QueryRelationship {
    const isSubject = delegateOrSubject === 'subject';
    const query: QueryRelationship = { deleted: false };

    if (isSubject) {
      query.subjectId = id;
    } else {
      query.delegateId = id;
    }
    return query;
  }

  private getRowCount = (delegate_or_subject: string, id: mongoose.Types.ObjectId): mongoose.Promise<number> => {
    return this.relationshipModel.count(this.createQueryObject(delegate_or_subject, id)).exec();
  };

  private getDistinct = (delegate_or_subject: string, id: mongoose.Types.ObjectId, field: string): mongoose.Promise<IRelationship[]> => {
    return this.relationshipModel.distinct(field, this.createQueryObject(delegate_or_subject, id)).exec();
  };

  private mapRows(delegate_or_subject: string, relDocs: IRelationship[]) {
    return relDocs.map(relDoc => {
      if (delegate_or_subject === 'delegate') {
        return {
          name: relDoc.subjectsNickName || relDoc.subjectName,
          subName: relDoc.subjectAbn,
          relId: relDoc.subjectId,
          rel: relDoc.type,
          access: relDoc.subjectRole,
          status: relDoc.status
        };
      } else {
        return {
          name: relDoc.delegatesNickName || relDoc.delegateName,
          subName: relDoc.delegateAbn,
          relId: relDoc.delegateId,
          rel: relDoc.type,
          access: relDoc.delegateRole,
          status: relDoc.status
        };
      }
    });
  }

  /* tslint:disable:no-empty */
  private mergeIdentities(relationshipTable) {
  }

  /* 
   * given id, retrieve relationship
   */
  private getById = async (req: Request, res: Response) => {
    const id = new mongoose.Types.ObjectId(req.params.id);
    this.relationshipModel.getRelationshipById(id).then(sendDocument(res), sendNotFoundError(res));
  };

  /* 
   * list relationships for a specific delegate party
   */
  /* tslint:disable:no-unused-variable */
  /* tslint:disable:max-func-body-length */
  private parsePaginationParams(req: Request): Promise<PaginationParams> {
    const schema = {
      'pageNo': {
        notEmpty: true,
        isInt: {
          errorMessage: 'Minimum value for pageNo is 0 and maximum value is 9999',
          options: {
            min: 0,
            max: 9999
          }
        },
        errorMessage: 'Invalid page no'
      },
      'pageSize': {
        notEmpty: true,
        errorMessage: 'Invalid page size',
        isIn: {
          options: [['5', '10', '25', '50', '100']]
        }
      },
      'delegateOrSubject': {
        notEmpty: true,
        isIn: {
          options: [['subject', 'delegate']]
        },
        errorMessage: 'delegateOrSubject can be only subject or delegate'
      },
      'id': {
        notEmpty: true,
        isMongoId: {
        },
        errorMessage: 'Id is not valid'
      }
    };
    return new Promise<PaginationParams>((resolve, errorResolver) => {
      // commented this out to avoid typescript compile errors as this entire controller is being replaced
      //req.checkParams(schema);
      const errors = req.validationErrors(false) as { msg: string }[];
      if (errors) {
        errorResolver(errors.map((e) => e.msg));
      } else {
        resolve(new PaginationParams(
          +req.params.pageSize,
          +req.params.pageNo,
          req.params.delegateOrSubject,
          req.params.id));
      }
    });
  }
  private getList = async (req: Request, res: Response) => {
    try {
      const params = await this.parsePaginationParams(req);
      const query = this.createQueryObject(params.delegateOrSubject, params.id);
      const toReturn = await this.relationshipModel.find(query)
        .skip((params.pageNo - 1) * params.pageSize)
        .limit(params.pageSize).exec();
      sendDocument(res)(toReturn);
    } catch (error) {
      sendError(res)(error);
    }
  };

  private addRelationship = async (req: Request, res: Response) => {
    this.relationshipModel.create(req.body).then(sendDocument(res), sendError(res));
  };
  /*
   * DEPRECATED. Early implementation (< May 2016).
   * Remove once all clients use v2 URL.
   */
  private getRelationdhipTable = async (req: Request, res: Response) => {
    try {
      const party = await this.partyModel.getPartyByIdentity(req.params.type, req.params.value);

      const relationships = await this.relationshipModel.find(
        this.createQueryObject(req.params.delegate_or_subject, party._id))
        .skip((req.params.page - 1) * req.params.page_size).
        limit(+req.params.pageSize).exec();

      const rowCount = await this.getRowCount(
        req.params.delegate_or_subject, party._id);

      const types = await this.getDistinct(
        req.params.delegate_or_subject, party._id, 'type');

      const table = this.mapRows(
        req.params.delegate_or_subject, relationships);

      sendDocument(res)({
        total: rowCount,
        table: table,
        relationshipOptions: types,
        accessLevelOptions: accessLevels,
        statusValueOptions: statusOptions
      });
    } catch (e) {
      sendError(res)(e);
    }
  };
  /*
   * Version that matches HLD as of 13-May-2016
   */
  /* tslint:disable:no-unused-variable */
  /* tslint:disable:max-func-body-length */
  private getRelationdhipTable2 = async (req: Request, res: Response) => {
    try {
      const party = await this.partyModel.getPartyByIdentity(
        req.params.type, req.params.value
      );

      const pageSize = (req.query.pageSize || 5);
      const pageNo   = (req.query.pageNo   || 1);

      const relationships = await this.relationshipModel.find(
        this.createQueryObject(
          req.params.delegate_or_subject, party._id))
        .skip((pageNo - 1) * pageSize).limit(pageSize).
        populate('delegateId').populate('subjectId')
        .select({'delegateId._id': 0})
        .select({'subjectId._id': 0})
        .select({'delegateId.agency': 0})
        .select({'subjectId.agency': 0})
        .select({_id: 0}).exec();

      const rowCount = await this.getRowCount(
        req.params.delegate_or_subject, party._id);

      const types = await this.getDistinct(
        req.params.delegate_or_subject, party._id, 'type');

      const relationshipTable = this.mapRows(
        req.params.delegate_or_subject, relationships);
      const tableTuples = this.mergeIdentities(relationshipTable);

      sendDocument(res)({
        total: rowCount,
        table: tableTuples,
        relationshipOptions: types,
        accessLevelOptions: accessLevels,
        statusValueOptions: statusOptions
      });
    } catch (e) {
      sendError(res)(e);
    }
  };

  public assignRoutes = (router: Router) => {
    router.get('/v1/relationship/list/:delegateOrSubject/:id/page/:pageNo/size/:pageSize', this.getList);
    router.get('/v1/relationship/table/:delegateOrSubject/:value/:type/page/:pageNo/size/:pageSize', this.getRelationdhipTable);
    router.post('/v1/relationship', this.addRelationship);
    router.get('/v1/relationship/:id', this.getById);
    return router;
  };
}
