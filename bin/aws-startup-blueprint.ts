#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsStartupBlueprintStack } from '../lib/aws-startup-blueprint-stack';

const app = new cdk.App();
new AwsStartupBlueprintStack(app, 'AwsStartupBlueprintStack', {
    description: "The AWS Startup Blueprint is a strongly opinonated architecture for any Startup looking to start using AWS follwing best practices on day 1. (ib-7061756C75)"
});
