import core = require("@aws-cdk/core");
import sc = require("@aws-cdk/aws-servicecatalog");
import s3 = require("@aws-cdk/aws-s3");
import ec2 = require("@aws-cdk/aws-ec2");
import log = require('@aws-cdk/aws-logs');
import iam = require("@aws-cdk/aws-iam");
import cfn = require("@aws-cdk/aws-cloudformation");
import codebuild = require("@aws-cdk/aws-codebuild");
import codecommit = require("@aws-cdk/aws-codecommit");
import codepipeline = require("@aws-cdk/aws-codepipeline");
import codepipelineactions = require("@aws-cdk/aws-codepipeline-actions");
import lambda = require("@aws-cdk/aws-lambda");
import s3asset = require("@aws-cdk/aws-s3-assets");
import * as path from 'path';
import * as fs from 'fs';

export interface CdkCloudFormationProductProps extends core.StackProps {
    githubOwner: string;
    githubRepo: string;
    productName: string;
    cdkLanguage: CdkCloudFormationProduct.CdkLanguage;
}


    
export class CdkCloudFormationProduct extends core.Construct {
    

    constructor(scope: core.Construct, id: string, props: CdkCloudFormationProductProps) {
        super(scope, id);
        
        

        const directoryAsset = new s3asset.Asset(this, "zippedStartingSourceCode", {
          path: path.join(__dirname, 'serviceCatalogShimRepo'),
          followSymlinks: core.SymlinkFollowMode.NEVER,
          ignoreMode: core.IgnoreMode.GIT
        });

        

        const codeRepo = new codecommit.CfnRepository(this, 'ccRepo', {
           repositoryName:  props.githubRepo,
           repositoryDescription: `Repo for ${props.productName}`,
           code: {
               branchName: 'main',
               s3: {
                   bucket: directoryAsset.bucket.bucketName,
                   key: directoryAsset.s3ObjectKey
               }
           } 
            
        });
        
        
        const pipeline = new codepipeline.Pipeline(this, `${props.githubRepo}-pipeline`, {
            pipelineName: `${props.githubRepo}-pipeline`,
        });
        
        const sourceOutput = new codepipeline.Artifact();

        
        pipeline.addStage({
            stageName: 'Source',
            actions: [ new codepipelineactions.CodeCommitSourceAction({
                actionName: 'InitRepo',
                repository: codecommit.Repository.fromRepositoryName(this, 'stagedRepo', props.githubRepo),
                output: sourceOutput,
                branch: 'main',
                codeBuildCloneOutput: true
            })
          ],
        });

        var installCommands = [
             'npm -g install typescript'
            ,'npm install -g aws-cdk'
            ,'git config --global user.email "quickstart@amazon.com"'
            ,'git config --global user.name "Blueprint Pipeline"'
            ,`git pull https://github.com/${props.githubOwner}/${props.githubRepo} --allow-unrelated-histories`
            
        ];
        
        if(props.cdkLanguage == CdkCloudFormationProduct.CdkLanguage.Typescript){
            installCommands.push('npm install')
        }
        if(props.cdkLanguage == CdkCloudFormationProduct.CdkLanguage.Python){
            installCommands.push('pip install -r requirements.txt')
        }
        
        var buildCommands = [
        ];
        
        if(props.cdkLanguage == CdkCloudFormationProduct.CdkLanguage.Typescript){
            buildCommands.push('npm run build')
        }
        if(props.cdkLanguage == CdkCloudFormationProduct.CdkLanguage.Python){
        }
        
        buildCommands.push('cdk deploy --require-approval never')

        
        const codeBuildProjectRole = new iam.Role(this, 'codeBuildProjectRole', {
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),    
        
        })


        const cdkMinPolicy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "resourceWidePermissions",
                    "Effect": "Allow",
                    "Action": [
                        "ec2:DescribeImages",
                        "iam:GetRole",
                        "iam:GetAccountPasswordPolicy",
                        "cloudformation:ListStacks",
                        "cloudformation:DescribeStackEvents",
                        "health:DescribeEventAggregates",
                        "ec2:DescribeAvailabilityZones",
                        "iam:ListAccountAliases",
                        "iam:ListRoles",
                        "ec2:DescribePrefixLists",
                        "cloudformation:DescribeStacks",
                        "iam:GetAccountSummary"
                    ],
                    "Resource": "*"
                } ,               
                {
                    "Sid": "assumeRolePermission",
                    "Effect": "Allow",
                    "Action": [
                        "sts:AssumeRole",
                    ],
                    "Resource": [
                        'arn:aws:iam::*:role/cdk-readOnlyRole',
                        'arn:aws:iam::*:role/cdk-hnb659fds-deploy-role-*',
                        'arn:aws:iam::*:role/cdk-hnb659fds-file-publishing-*'
                    ]
                }
                
            ]
        };
        
        const cdkMinPolicyDocument = iam.PolicyDocument.fromJson(cdkMinPolicy);
        

        const cdkMinManagedPolicy = new iam.ManagedPolicy(this, 'cdkMinPolicy', {
          document: cdkMinPolicyDocument
        });
        
        
        cdkMinManagedPolicy.attachToRole(codeBuildProjectRole);
        
        

        //const codeBuildPipeProject = new codebuild.PipelineProject(this, 'Pipeline');
        const codeBuildPipeProject = new codebuild.PipelineProject(this, 'Pipeline', {
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: installCommands
                    },
                    build: {
                        commands: buildCommands
                    },
                },
            }),
            role: codeBuildProjectRole
        });
        
        
        pipeline.addStage({
            stageName: 'Build',
            actions: [ 
                new codepipelineactions.CodeBuildAction({
                  actionName: 'CodeBuild',
                  project: codeBuildPipeProject,
                  input: sourceOutput,
                  outputs: [new codepipeline.Artifact()], // optional
                  executeBatchBuild: false // optional, defaults to false
                })
            ]
        });
        
        

        
        
        
    }
}
export namespace CdkCloudFormationProduct
{
    export enum CdkLanguage
    {
        Typescript,
        Python
    }
}


export interface ServiceCatalogProps extends core.StackProps {
}

export class BlueprintServiceCatalog extends core.Construct {
    public readonly ClientVpnEndpoint: ec2.CfnClientVpnEndpoint;
  
    constructor(scope: core.Construct, id: string, props: ServiceCatalogProps) {
        super(scope, id);

        const informaticsCatalog = new sc.CfnPortfolio(this, 'InformaticsCatalog', {
            displayName: "Blueprint Informatics Catalog",
            providerName: "AWS",
            description: "Collection of bio and chem informatics tools easily deployed into the AWS Blueprint.",            
        });
        
        
        
        const swiftConnectivity = new sc.CfnCloudFormationProduct(this, 'SWIFT', {
            owner: "AWS",
            description: "SWIFT Client Connectivity on AWS - A standardized environment for connecting to the SWIFT network",
            distributor: "AWS",
            supportDescription: `This Quick Start provides instructions for deploying SWIFT Client Connectivity on the Amazon Web Services (AWS) Cloud.
This deployment is for users who want a standardized environment that helps organizations with workloads that require connectivity to the SWIFT network. This falls under the compliance guidelines outlined in SWIFT’s Customer Security Program (CSP) Control Framework (CSCF). The CSCF consists of mandatory and advisory security controls for all SWIFT users. This deployment includes templates that automate the deployment using recommended settings that follow SWIFT CSP controls.
The SWIFT components in scope for the baseline implementation include SWIFT messaging interfaces, SWIFT communication interfaces, and SWIFT integration components. For more information, see the SWIFT glossary.`,
            supportUrl: "https://aws.amazon.com/quickstart/architecture/swift-client-connectivity/",
            name: "SWIFT Client Connectivity on AWS",
            provisioningArtifactParameters: [{
                info: {
                    LoadTemplateFromURL: "https://s3.amazonaws.com/aws-quickstart/quickstart-chemaxon-registry/templates/chemaxon-registry.template"
                }
            }]


        });

        const swiftConnectivityAssoc = new sc.CfnPortfolioProductAssociation(this, 'SWIFT', {
            portfolioId: informaticsCatalog.ref,
            productId: swiftConnectivity.ref
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


        // const nextflow = new sc.CfnCloudFormationProduct(this, 'Nextflow', {
        //     owner: "AWS",
        //     description: "Nextflow enables scalable and reproducible scientific workflows using software containers. It allows the adaptation of pipelines written in the most common scripting languages.",
        //     distributor: "Comparative Bioinformatics group at the Barcelona Centre for Genomic Regulation (CRG).",            
        //     supportUrl: "https://docs.opendata.aws/genomics-workflows/orchestration/nextflow/nextflow-overview/",            
        //     name: "Nextflow",
        //     provisioningArtifactParameters: [{
        //         info: {
        //             LoadTemplateFromURL: "https://s3.amazonaws.com/aws-genomics-workflows/templates/aws-genomics-root-novpc.template.yaml"
        //         }
        //     }]
        // });

        // const nextflowAssocation = new sc.CfnPortfolioProductAssociation(this, 'NextflowAssocation', {
        //     portfolioId: informaticsCatalog.ref,
        //     productId: nextflow.ref
        // });



        // const dotmatics = new sc.CfnCloudFormationProduct(this, 'Dotmatics', {
        //     owner: "Dotmatics",
        //     description: "Dotmatics Suite running on AWS.  Please contact sales@dotmatics.com for licensing details.",
        //     distributor: "Dotmatics",            
        //     supportUrl: "https://aws-quickstart.s3.amazonaws.com/quickstart-dotmatics/doc/dotmatics-suite-on-the-aws-cloud.pdf",
        //     name: "Dotmatics Suite",
        //     supportDescription: "Support is provided through our usual channels – please visit our support pages or drop us an email.",
        //     supportEmail: "support@dotmatics.com",
        //     provisioningArtifactParameters: [{
        //         info: {
        //             LoadTemplateFromURL: "https://aws-quickstart.s3.amazonaws.com/quickstart-dotmatics/templates/dotmatics.template"
        //         }
        //     }]
        // });

        // const dotmaticsAssociation = new sc.CfnPortfolioProductAssociation(this, 'DotmaticsAssociation', {
        //     portfolioId: informaticsCatalog.ref,
        //     productId: dotmatics.ref
        // });

        // const hailNotebook = new sc.CfnCloudFormationProduct(this, 'HailNotebook', {
        //     owner: "AWS",
        //     description: "Deploys an AWS SageMaker notebook that can integrate with with Hail 0.2 cluster on EMR.",
        //     distributor: "Broad Institute",            
        //     supportUrl: "https://aws-quickstart.github.io/quickstart-hail/",
        //     name: "Hail Notebook on AWS SageMaker",
        //     provisioningArtifactParameters: [{
        //         info: {
        //             LoadTemplateFromURL: "https://aws-quickstart.s3.amazonaws.com/quickstart-hail/templates/hail-sagemaker.template.yaml"
        //         }
        //     }]
        // });

        // const hailCluster = new sc.CfnCloudFormationProduct(this, 'HailCluster', {
        //     owner: "AWS",
        //     description: "Deploys Hail 0.2, an open-source library for scalable genomic data exploration, on AWS EMR.",
        //     distributor: "Broad Institute",            
        //     supportUrl: "https://aws-quickstart.github.io/quickstart-hail/",
        //     name: "Hail Cluster on AWS EMR",
        //     provisioningArtifactParameters: [{
        //         info: {
        //             LoadTemplateFromURL: "https://aws-quickstart.s3.amazonaws.com/quickstart-hail/templates/hail-core.template.yaml"
        //         }
        //     }]
        // });

        // const hailNotebookAssociation = new sc.CfnPortfolioProductAssociation(this, 'HailNotebookAssociation', {
        //     portfolioId: informaticsCatalog.ref,
        //     productId: hailNotebook.ref
        // });

        // const hailCLusterAssociation = new sc.CfnPortfolioProductAssociation(this, 'HailClusterAssociation', {
        //     portfolioId: informaticsCatalog.ref,
        //     productId: hailCluster.ref
        // });

        // const titian = new sc.CfnCloudFormationProduct(this, 'Titian', {
        //     owner: "Titian Software Limited",
        //     description: "Mosaic FreezerManagement is a comprehensive and cost-effective software solution for managing and tracking all types of sample inventory, backed by a full audit trail. It provides a flexible interface to define and record properties for any type of sample or container, and manages your entire hierarchy of storage including freezers, shelves, cupboards, etc. Other features include an intuitive search interface, and expiry date tracking. IMPORTANT NOTE:  Please contact Titian at info@titian.co.uk for validation before you launch the template below, otherwise the template will fail.",
        //     distributor: "Titian Software Limited",            
        //     supportUrl: "https://aws-quickstart.s3.amazonaws.com/quickstart-titian-mosaic/doc/titian-mosaic-freezermanagement-on-the-aws-cloud.pdf",
        //     supportDescription: "Titian supports a worldwide customer base – including customer sites in Europe, USA and Asia. Support may be provided by email, telephone or shared Desktop sessions",
        //     supportEmail: "info@titian.co.uk",
        //     name: "Mosaic FreezerManagement",
        //     provisioningArtifactParameters: [{
        //         info: {
        //             LoadTemplateFromURL: "https://aws-quickstart.s3.amazonaws.com/quickstart-titian-mosaic/templates/titian-mosaic.template"
        //         }
        //     }]
        // });

        // const titianAssociation = new sc.CfnPortfolioProductAssociation(this, 'TitianAssociation', {
        //     portfolioId: informaticsCatalog.ref,
        //     productId: titian.ref
        // });

       

    }
}