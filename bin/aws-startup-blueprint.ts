#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsStartupBlueprintStack } from '../lib/aws-startup-blueprint-stack';
import { ServiceCatalogCdkTemplateStackProps, ServiceCatalogCdkTemplateStack} from '../bin/aws-blueprint-catalog-templates';
import { CdkCloudFormationProduct }  from '../lib/aws-service-catalog';


const app = new cdk.App();
const blueprintCore = new AwsStartupBlueprintStack(app, 'AwsFintechBlueprint', {
    description: "AWS Fintech Blueprint is an AWS Quick Start that helps Fintechs deploy core AWS Infrastructure as well as CloudFormation templates for common ISV solutions. (qs-u4nd84j65) (ib-u4nd84j65)"
});


const swiftServiceCatalogTemplateSynthApp = new cdk.App();
new ServiceCatalogCdkTemplateStack(swiftServiceCatalogTemplateSynthApp, 'SwiftDigitalConnectivity', {
    description: "This template is deployed by the Fintech Blueprint service catalog which creates a code pipeline that deploys the SWIFT digital connectivity quickstart. (ib-153df3v98)"
    ,githubRepo: 'quickstart-swift-digital-connectivity'
    ,githubOwner: 'aws-quickstart'
    ,cdkLanguage: CdkCloudFormationProduct.CdkLanguage.Python
    ,productName: "SWIFT CSP QuickStart"
    ,TargetServiceCatalog: blueprintCore.ServiceCatalog
});
swiftServiceCatalogTemplateSynthApp.synth();