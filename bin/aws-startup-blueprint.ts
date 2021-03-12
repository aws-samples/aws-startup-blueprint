#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsDiGAVBlueprintStack } from '../lib/aws-startup-blueprint-stack';

const app = new cdk.App();
new AwsDiGAVBlueprintStack(app, 'AwsDiGAVBlueprint', {
    description: "AWS DiGAV Blueprint CDK is an AWS Quick Start that helps companies deploy core AWS Infrastructure as well as CloudFormation templates that may help meet DiGAV requirements."
});
