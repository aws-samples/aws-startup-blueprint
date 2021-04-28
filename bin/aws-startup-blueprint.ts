#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsStartupBlueprintStack } from '../lib/aws-startup-blueprint-stack';
import { ServiceCatalogCdkTemplateStackProps, ServiceCatalogCdkTemplateStack} from '../bin/aws-blueprint-catalog-templates';
import { CdkCloudFormationProduct }  from '../lib/aws-service-catalog';


const swiftServiceCatalogTemplateSynthApp = new cdk.App();
new ServiceCatalogCdkTemplateStack(swiftServiceCatalogTemplateSynthApp, 'SwiftDigitalConnectivity', {
    description: "This template is deployed by the Fintech Blueprint service catalog which creates a code pipeline that deploys the SWIFT digital connectivity quickstart. (ib-153df3v98)"
    ,githubRepo: 'quickstart-swift-digital-connectivity'
    ,githubOwner: 'aws-quickstart'
    ,cdkLanguage: CdkCloudFormationProduct.CdkLanguage.Python
    ,productName: "SWIFT CSP QuickStart"
});
swiftServiceCatalogTemplateSynthApp.synth();

//const envUSA = { account: '8373873873', region: 'us-west-2' };
const envUSA = { region: 'us-west-2' };

const app = new cdk.App();
new AwsStartupBlueprintStack(app, 'AwsBiotechBlueprint', {
    env: envUSA,
    description: "AWS Biotech Blueprint CDK is an AWS Quick Start that helps Biotech companies deploy core AWS Infrastructure as well as CloudFormation templates for common ISV solutions. (qs-1of009lua) (ib-1of009lua)"
});


