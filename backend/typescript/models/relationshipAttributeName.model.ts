import * as mongoose from 'mongoose';
import {RAMEnum, ICodeDecode, CodeDecodeSchema} from './base';
import {HrefValue, RelationshipAttributeName as DTO} from '../../../commons/RamAPI';

// enums, utilities, helpers ..........................................................................................

// see https://github.com/atogov/RAM/wiki/Relationship-Attribute-Types
export class RelationshipAttributeNameDomain extends RAMEnum {

    public static Null = new RelationshipAttributeNameDomain('NULL');
    public static Boolean = new RelationshipAttributeNameDomain('BOOLEAN');
    public static Number = new RelationshipAttributeNameDomain('NUMBER');
    public static String = new RelationshipAttributeNameDomain('STRING');
    public static Date = new RelationshipAttributeNameDomain('DATE');
    public static Markdown = new RelationshipAttributeNameDomain('MARKDOWN');
    public static SelectSingle = new RelationshipAttributeNameDomain('SELECT_SINGLE');
    public static SelectMulti = new RelationshipAttributeNameDomain('SELECT_MULTI');

    protected static AllValues = [
        RelationshipAttributeNameDomain.Null,
        RelationshipAttributeNameDomain.Boolean,
        RelationshipAttributeNameDomain.Number,
        RelationshipAttributeNameDomain.String,
        RelationshipAttributeNameDomain.Date,
        RelationshipAttributeNameDomain.Markdown,
        RelationshipAttributeNameDomain.SelectSingle,
        RelationshipAttributeNameDomain.SelectMulti
    ];

    constructor(name:string) {
        super(name);
    }
}

export class RelationshipAttributeNameClassifier extends RAMEnum {

    public static Other = new RelationshipAttributeNameClassifier('OTHER');
    public static Permission = new RelationshipAttributeNameClassifier('PERMISSION');

    protected static AllValues = [
        RelationshipAttributeNameClassifier.Other,
        RelationshipAttributeNameClassifier.Permission
    ];

    constructor(name:string) {
        super(name);
    }
}

// schema .............................................................................................................

const RelationshipAttributeNameSchema = CodeDecodeSchema({
    domain: {
        type: String,
        required: [true, 'Domain is required'],
        trim: true,
        enum: RelationshipAttributeNameDomain.valueStrings()
    },
    classifier: {
        type: String,
        required: [true, 'Classifier is required'],
        trim: true,
        enum: RelationshipAttributeNameClassifier.valueStrings()
    },
    category: {
        type: String,
        trim: true
    },
    purposeText: {
        type: String,
        required: [true, 'Purpose Text is required'],
        trim: true
    },
    permittedValues: [{
        type: String
    }]
});

// interfaces .........................................................................................................

export interface IRelationshipAttributeName extends ICodeDecode {
    domain: string;
    classifier: string;
    category?: string;
    purposeText: string;
    permittedValues: string[];
    domainEnum(): RelationshipAttributeNameDomain;
    toHrefValue(includeValue:boolean): Promise<HrefValue<DTO>>;
    toDTO(): Promise<DTO>;
}

export interface IRelationshipAttributeNameModel extends mongoose.Model<IRelationshipAttributeName> {
    findByCodeIgnoringDateRange: (code:string) => Promise<IRelationshipAttributeName>;
    findByCodeInDateRange: (code:string, date:Date) => Promise<IRelationshipAttributeName>;
    listIgnoringDateRange: () => Promise<IRelationshipAttributeName[]>;
    listInDateRange: (date:Date) => Promise<IRelationshipAttributeName[]>;
}

// instance methods ...................................................................................................

RelationshipAttributeNameSchema.method('domainEnum', function () {
    return RelationshipAttributeNameDomain.valueOf(this.domain);
});

RelationshipAttributeNameSchema.method('toHrefValue', async function (includeValue:boolean) {
    return new HrefValue(
        '/api/v1/relationshipAttributeName/' + this.code,
        includeValue ? await this.toDTO() : undefined
    );
});

RelationshipAttributeNameSchema.method('toDTO', async function () {
    return new DTO(
        this.code,
        this.shortDecodeText,
        this.longDecodeText,
        this.startDate,
        this.endDate,
        this.shortDecodeText,
        this.domain,
        this.classifier,
        this.category,
        this.permittedValues
    );
});

// static methods .....................................................................................................

RelationshipAttributeNameSchema.static('findByCodeIgnoringDateRange', (code:string) => {
    return this.RelationshipAttributeNameModel
        .findOne({
            code: code
        })
        .exec();
});

RelationshipAttributeNameSchema.static('findByCodeInDateRange', (code:string, date:Date) => {
    return this.RelationshipAttributeNameModel
        .findOne({
            code: code,
            startDate: {$lte: date},
            $or: [{endDate: null}, {endDate: {$gte: date}}]
        })
        .exec();
});

RelationshipAttributeNameSchema.static('listIgnoringDateRange', () => {
    return this.RelationshipAttributeNameModel
        .find({
        })
        .deepPopulate([
            'attributeNameUsages.attributeName'
        ])
        .sort({name: 1})
        .exec();
});

RelationshipAttributeNameSchema.static('listInDateRange', (date:Date) => {
    return this.RelationshipAttributeNameModel
        .find({
            startDate: {$lte: date},
            $or: [{endDate: null}, {endDate: {$gte: date}}]
        })
        .deepPopulate([
            'attributeNameUsages.attributeName'
        ])
        .sort({name: 1})
        .exec();
});

// concrete model .....................................................................................................

export const RelationshipAttributeNameModel = mongoose.model(
    'RelationshipAttributeName',
    RelationshipAttributeNameSchema) as IRelationshipAttributeNameModel;
