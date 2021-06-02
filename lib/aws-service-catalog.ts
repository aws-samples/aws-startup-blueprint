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
    TargetCatalog: BlueprintServiceCatalog;
}


    
export class CdkCloudFormationProduct extends core.Construct {
    

    constructor(scope: core.Construct, id: string, props: CdkCloudFormationProductProps) {
        super(scope, id);
        

        const codeRepo = new codecommit.CfnRepository(this, 'ccRepo', {
           repositoryName:  props.githubRepo,
           repositoryDescription: `Repo for ${props.productName}`,
           code: {
               branchName: 'main',
               s3: {
                   bucket: props.TargetCatalog.EmptyRepoZipAsset.bucket.bucketName,
                   key: props.TargetCatalog.EmptyRepoZipAsset.s3ObjectKey
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
    public readonly EmptyRepoZipAsset: s3asset.Asset;
  
    constructor(scope: core.Construct, id: string, props: ServiceCatalogProps) {
        super(scope, id);

        this.EmptyRepoZipAsset = new s3asset.Asset(this, "zippedStartingSourceCode", {
          path: path.join(__dirname, 'serviceCatalogShimRepo'),
          followSymlinks: core.SymlinkFollowMode.NEVER,
          ignoreMode: core.IgnoreMode.GIT
        });

        const blueprintCatalog = new sc.CfnPortfolio(this, 'FintechBlueprintCatalog', {
            displayName: "Fintech Blueprint Software Catalog",
            providerName: "AWS",
            description: "Collection of Fintech tools and data easily deployed into the AWS Fintech Blueprint.",            
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
                    LoadTemplateFromURL: "https://raw.githubusercontent.com/aws-samples/aws-startup-blueprint/fintech-dev/templates/SwiftDigitalConnectivity.template.json"
                }
            }]


        });

        const swiftConnectivityAssocation = new sc.CfnPortfolioProductAssociation(this, 'swiftConnectivityAssoc', {
            portfolioId: blueprintCatalog.ref,
            productId: swiftConnectivity.ref
        });


    }
}