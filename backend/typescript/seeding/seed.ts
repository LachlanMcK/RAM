import * as mongoose from 'mongoose';
import {conf} from '../bootstrap';

import {IRelationshipAttributeName, RelationshipAttributeNameModel, RelationshipAttributeNameStringDomain} from '../models/relationshipAttributeName.model';
import {IRelationshipType, RelationshipTypeModel} from '../models/relationshipType.model';

const now = new Date();

// seeder .............................................................................................................

class Seeder {

    public static async connect() {
        await mongoose.connect(conf.mongoURL);
        console.log('\nConnected to the db: ', conf.mongoURL);
    }

    public static async dropDatabase() {
        if (conf.devMode) {
            console.info('Dropping database in dev mode (starting fresh)');
            await mongoose.connection.db.dropDatabase();
        } else {
            console.info('Not dropping database in prod mode (appending)');
        }
    }

    public static async disconnect() {
        mongoose.connection.close();
    }

    public static async createRelationshipAttributeNameModel(values:IRelationshipAttributeName) {
        const code = values.code;
        const existingModel = await RelationshipAttributeNameModel.findByCode(code);
        if (existingModel === null) {
            console.log('-', code);
            const model = await RelationshipAttributeNameModel.create(values);
            return model;
        } else {
            console.log('-', code, ' ... skipped');
            return existingModel;
        }
    }

    public static async createRelationshipTypeModel(values:IRelationshipType) {
        const code = values.code;
        const existingModel = await RelationshipTypeModel.findByCode(code);
        if (existingModel === null) {
            console.log('-', code);
            const model = await RelationshipTypeModel.create(values);
            return model;
        } else {
            console.log('-', code, ' ... skipped');
            return existingModel;
        }
    }

}

// load reference data ................................................................................................

/* tslint:disable:max-func-body-length */
const load = async () => {

    // relationship attribute names

    console.log('\nInserting Relationship Attribute Names:');

    const employeeNumber_attributeName = await Seeder.createRelationshipAttributeNameModel({
        code: 'EMPLOYEE_NUMBER',
        shortDecodeText: 'Employee Number',
        longDecodeText: 'Employee Number',
        startDate: now,
        domain: RelationshipAttributeNameStringDomain,
        purposeText: 'Employee Number'
    } as IRelationshipAttributeName);

    // relationship types

    console.log('\nInserting Relationship Types:');

    //'Business Representative',
    //'Online Service Provider',
    //'Insolvency practitioner',
    //'Trusted Intermediary - tax agent, BAS Agent, Financial Advisor, Lawyer',
    //'Intermediary – Real Estate Agent, Immigration Agent',
    //'Importer Export Agent',
    //'Doctor Patient',
    //'Nominated Entity',
    //'Power of Attorney (Voluntary)',
    //'Power of Attorney (Involuntary)',
    //'Executor of deceased estate',
    //'Pharmaceutical',
    //'Institution to student – relationship',
    //'Training organisations (RTO)',
    //'Parent - Child',
    //'Employment Agents – employment'

    await Seeder.createRelationshipTypeModel({
        code: 'BUSINESS_REPRESENTATIVE',
        shortDecodeText: 'Business Representative',
        longDecodeText: 'Business Representative',
        startDate: now
    } as IRelationshipType);

    await Seeder.createRelationshipTypeModel({
        code: 'ONLINE_SERVICE_PROVIDER',
        shortDecodeText: 'Online Service Provider',
        longDecodeText: 'Online Service Provider',
        startDate: now
    } as IRelationshipType);

};

// load sample data ...................................................................................................

// rock and roll ......................................................................................................

Seeder
    .connect()
    .then(Seeder.dropDatabase)
    .then(load)
    .then(Seeder.disconnect);