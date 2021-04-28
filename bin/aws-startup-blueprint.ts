#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsStartupBlueprintStack } from '../lib/aws-startup-blueprint-stack';
import { ServiceCatalogCdkTemplateStackProps, ServiceCatalogCdkTemplateStack} from '../bin/aws-blueprint-catalog-templates';
import { CdkCloudFormationProduct }  from '../lib/aws-service-catalog';


const swiftServiceCatalogTemplateSynthApp = new cdk.App();
new ServiceCatalogCdkTemplateStack(swiftServiceCatalogTemplateSynthApp, 'SwiftDigitalConnectivity', {
    description: ""
    ,githubRepo: 'quickstart-swift-digital-connectivity'
    ,githubOwner: 'aws-quickstart'
    ,cdkLanguage: CdkCloudFormationProduct.CdkLanguage.Python
    ,productName: "SWIFT CSP QuickStart"
});
swiftServiceCatalogTemplateSynthApp.synth();


const app = new cdk.App();
new AwsStartupBlueprintStack(app, 'AwsBiotechBlueprint', {
    description: "AWS Biotech Blueprint CDK is an AWS Quick Start that helps Biotech companies deploy core AWS Infrastructure as well as CloudFormation templates for common ISV solutions. (qs-1of009lua) (ib-1of009lua)"
});



