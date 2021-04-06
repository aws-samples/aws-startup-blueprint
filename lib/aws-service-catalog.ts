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

        // const chemAxon = new sc.CfnCloudFormationProduct(this, 'ChemAxon', {
        //     owner: "ChemAxon",
        //     description: "ChemAxon's Compound Registration is a system built on a set of web services, aiding users to register molecular structures into a compound database. The registration process spots unique compounds among a set of structures already contained within the database.",
        //     distributor: "AWS",
        //     supportDescription: "You need to subscribe to the ChemAxon marketplace AMI before you can deploy this software. https://aws.amazon.com/marketplace/pp/B077F6VV3B?qid=1553611079631&sr=0-1&ref_=srh_res_product_title.",
        //     supportUrl: "https://chemaxon.com/support",
        //     supportEmail: "support@chemaxon.com",
        //     name: "ChemAxon Compound Registry",
        //     provisioningArtifactParameters: [{
        //         info: {
        //             LoadTemplateFromURL: "https://s3.amazonaws.com/aws-quickstart/quickstart-chemaxon-registry/templates/chemaxon-registry.template"
        //         }
        //     }]


        // });

        // const chemAxonAssocation = new sc.CfnPortfolioProductAssociation(this, 'ChemAxonAssociation', {
        //     portfolioId: informaticsCatalog.ref,
        //     productId: chemAxon.ref
        // });


       

    }
}