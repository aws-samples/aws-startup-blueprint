#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsStartupBlueprintStack } from '../lib/aws-startup-blueprint-stack';
import { CdkCloudFormationProductProps, CdkCloudFormationProduct, BlueprintServiceCatalog } from '../lib/aws-service-catalog';


export interface ServiceCatalogCdkTemplateStackProps extends cdk.StackProps{
    githubOwner: string,
    githubRepo: string,
    productName: string,
    cdkLanguage: CdkCloudFormationProduct.CdkLanguage.Python
    TargetServiceCatalog: BlueprintServiceCatalog
}

export class ServiceCatalogCdkTemplateStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props: ServiceCatalogCdkTemplateStackProps) {
    super(scope, id, props);
    
        new CdkCloudFormationProduct(this, 'product', {
            githubOwner: props.githubOwner,
            githubRepo: props.githubRepo,
            productName: props.productName, 
            cdkLanguage: CdkCloudFormationProduct.CdkLanguage.Python,
            TargetCatalog: props.TargetServiceCatalog
        });
        
    }
}


