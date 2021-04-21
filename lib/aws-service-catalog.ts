import core = require("@aws-cdk/core");
import sc = require("@aws-cdk/aws-servicecatalog");
import s3 = require("@aws-cdk/aws-s3");
import ec2 = require("@aws-cdk/aws-ec2");
import log = require('@aws-cdk/aws-logs');
import iam = require("@aws-cdk/aws-iam");
import cfn = require("@aws-cdk/aws-cloudformation");
import lambda = require("@aws-cdk/aws-lambda");
import * as fs from 'fs';



export interface ServiceCatalogProps extends core.StackProps {
}

export class BlueprintServiceCatalog extends core.Construct {
    public readonly ClientVpnEndpoint: ec2.CfnClientVpnEndpoint;
  
    constructor(scope: core.Construct, id: string, props: ServiceCatalogProps) {
        super(scope, id);

        const informaticsCatalog = new sc.CfnPortfolio(this, 'InformaticsCatalog', {
            displayName: "Fintech Blueprint Catalog",
            providerName: "AWS",
            description: "Collection of commercial and open sources tools easily deployed into the Fintech Blueprint.",            
        });




       

    }
}