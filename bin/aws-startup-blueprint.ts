#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsStartupBlueprintStack } from '../lib/aws-startup-blueprint-stack';

const app = new cdk.App();
new AwsStartupBlueprintStack(app, 'AwsFintechBlueprint', {
    description: "AWS Fintech Blueprint is an AWS Quick Start that helps Fintechs deploy core AWS Infrastructure as well as CloudFormation templates for common ISV solutions. (qs-u4nd84j65) (ib-u4nd84j65)"
});
