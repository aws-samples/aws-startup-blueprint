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
            displayName: "Biotech Blueprint Informatics Catalog",
            providerName: "AWS",
            description: "Collection of bio and chem informatics tools easily deployed into the Biotech Blueprint.",            
        });

        const chemAxon = new sc.CfnCloudFormationProduct(this, 'ChemAxon', {
            owner: "ChemAxon",
            description: "ChemAxon's Compound Registration is a system built on a set of web services, aiding users to register molecular structures into a compound database. The registration process spots unique compounds among a set of structures already contained within the database.",
            distributor: "AWS",
            supportDescription: "You need to subscribe to the ChemAxon marketplace AMI before you can deploy this software. https://aws.amazon.com/marketplace/pp/B077F6VV3B?qid=1553611079631&sr=0-1&ref_=srh_res_product_title.",
            supportUrl: "https://chemaxon.com/support",
            supportEmail: "support@chemaxon.com",
            name: "ChemAxon Compound Registry",
            provisioningArtifactParameters: [{
                info: {
                    LoadTemplateFromURL: "https://s3.amazonaws.com/aws-quickstart/quickstart-chemaxon-registry/templates/chemaxon-registry.template"
                }
            }]


        });

        const chemAxonAssocation = new sc.CfnPortfolioProductAssociation(this, 'ChemAxonAssociation', {
            portfolioId: informaticsCatalog.ref,
            productId: chemAxon.ref
        });


        const nextflow = new sc.CfnCloudFormationProduct(this, 'Nextflow', {
            owner: "AWS",
            description: "Nextflow enables scalable and reproducible scientific workflows using software containers. It allows the adaptation of pipelines written in the most common scripting languages.",
            distributor: "Comparative Bioinformatics group at the Barcelona Centre for Genomic Regulation (CRG).",            
            supportUrl: "https://docs.opendata.aws/genomics-workflows/orchestration/nextflow/nextflow-overview/",            
            name: "Nextflow",
            provisioningArtifactParameters: [{
                info: {
                    LoadTemplateFromURL: "https://s3.amazonaws.com/aws-genomics-workflows/templates/aws-genomics-root-novpc.template.yaml"
                }
            }]
        });

        const nextflowAssocation = new sc.CfnPortfolioProductAssociation(this, 'NextflowAssocation', {
            portfolioId: informaticsCatalog.ref,
            productId: nextflow.ref
        });



        const dotmatics = new sc.CfnCloudFormationProduct(this, 'Dotmatics', {
            owner: "Dotmatics",
            description: "Dotmatics Suite running on AWS.  Please contact sales@dotmatics.com for licensing details.",
            distributor: "Dotmatics",            
            supportUrl: "https://aws-quickstart.s3.amazonaws.com/quickstart-dotmatics/doc/dotmatics-suite-on-the-aws-cloud.pdf",
            name: "Dotmatics Suite",
            supportDescription: "Support is provided through our usual channels – please visit our support pages or drop us an email.",
            supportEmail: "support@dotmatics.com",
            provisioningArtifactParameters: [{
                info: {
                    LoadTemplateFromURL: "https://aws-quickstart.s3.amazonaws.com/quickstart-dotmatics/templates/dotmatics.template"
                }
            }]
        });

        const dotmaticsAssociation = new sc.CfnPortfolioProductAssociation(this, 'DotmaticsAssociation', {
            portfolioId: informaticsCatalog.ref,
            productId: dotmatics.ref
        });

        const hailNotebook = new sc.CfnCloudFormationProduct(this, 'HailNotebook', {
            owner: "AWS",
            description: "Deploys an AWS SageMaker notebook that can integrate with with Hail 0.2 cluster on EMR.",
            distributor: "Broad Institute",            
            supportUrl: "https://aws-quickstart.github.io/quickstart-hail/",
            name: "Hail Notebook on AWS SageMaker",
            provisioningArtifactParameters: [{
                info: {
                    LoadTemplateFromURL: "https://aws-quickstart.s3.amazonaws.com/quickstart-hail/templates/hail-sagemaker.template.yaml"
                }
            }]
        });

        const hailCluster = new sc.CfnCloudFormationProduct(this, 'HailCluster', {
            owner: "AWS",
            description: "Deploys Hail 0.2, an open-source library for scalable genomic data exploration, on AWS EMR.",
            distributor: "Broad Institute",            
            supportUrl: "https://aws-quickstart.github.io/quickstart-hail/",
            name: "Hail Cluster on AWS EMR",
            provisioningArtifactParameters: [{
                info: {
                    LoadTemplateFromURL: "https://aws-quickstart.s3.amazonaws.com/quickstart-hail/templates/hail-core.template.yaml"
                }
            }]
        });

        const hailNotebookAssociation = new sc.CfnPortfolioProductAssociation(this, 'HailNotebookAssociation', {
            portfolioId: informaticsCatalog.ref,
            productId: hailNotebook.ref
        });

        const hailCLusterAssociation = new sc.CfnPortfolioProductAssociation(this, 'HailClusterAssociation', {
            portfolioId: informaticsCatalog.ref,
            productId: hailCluster.ref
        });

        const titian = new sc.CfnCloudFormationProduct(this, 'Titian', {
            owner: "Titian Software Limited",
            description: "Mosaic FreezerManagement is a comprehensive and cost-effective software solution for managing and tracking all types of sample inventory, backed by a full audit trail. It provides a flexible interface to define and record properties for any type of sample or container, and manages your entire hierarchy of storage including freezers, shelves, cupboards, etc. Other features include an intuitive search interface, and expiry date tracking. IMPORTANT NOTE:  Please contact Titian at info@titian.co.uk for validation before you launch the template below, otherwise the template will fail.",
            distributor: "Titian Software Limited",            
            supportUrl: "https://aws-quickstart.s3.amazonaws.com/quickstart-titian-mosaic/doc/titian-mosaic-freezermanagement-on-the-aws-cloud.pdf",
            supportDescription: "Titian supports a worldwide customer base – including customer sites in Europe, USA and Asia. Support may be provided by email, telephone or shared Desktop sessions",
            supportEmail: "info@titian.co.uk",
            name: "Mosaic FreezerManagement",
            provisioningArtifactParameters: [{
                info: {
                    LoadTemplateFromURL: "https://aws-quickstart.s3.amazonaws.com/quickstart-titian-mosaic/templates/titian-mosaic.template"
                }
            }]
        });

        const titianAssociation = new sc.CfnPortfolioProductAssociation(this, 'TitianAssociation', {
            portfolioId: informaticsCatalog.ref,
            productId: titian.ref
        });

       

    }
}