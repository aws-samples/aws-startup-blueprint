import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';

const policyDocument = {

    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "EnforceBoundary",
            "Effect": "Allow",
            "Action": [
                "iam:CreateRole",
                "iam:DeleteRolePolicy",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:PutRolePolicy",
                "iam:PutRolePermissionsBoundary",
                "iam:CreateUser",
                "iam:DeleteUserPolicy",
                "iam:AttachUserPolicy",
                "iam:DetachUserPolicy",
                "iam:PutUserPolicy",
                "iam:PutUserPermissionsBoundary"
            ],
            "Resource": "*",
            "Condition": {
                "StringLike": {
                    "iam:PermissionsBoundary": "arn:aws:iam::*:policy/boundary-policy"
                }
            }
        },
        {
            "Sid": "DenyBoundaryPolicyEdit",
            "Effect": "Deny",
            "Action": [
                "iam:*PolicyVersion",
                "iam:DeletePolicy",
                "iam:SetDefaultPolicyVersion"
            ],
            "Resource": "arn:aws:iam::*:policy/boundary-policy"
        },
        {
            "Sid": "NoBoundaryUserDelete",
            "Effect": "Deny",
            "Action": "iam:Delete*PermissionsBoundary",
            "Resource": "*"
        },
        {
            "Sid": "AllowNotIAMTasks",
            "Effect": "Allow",
            "NotAction": [
                "iam:CreateRole",
                "iam:DeleteRolePolicy",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:PutRolePolicy",
                "iam:PutRolePermissionsBoundary",
                "iam:CreateUser",
                "iam:DeleteUserPolicy",
                "iam:AttachUserPolicy",
                "iam:DetachUserPolicy",
                "iam:PutUserPolicy",
                "iam:PutUserPermissionsBoundary"
            ],
            "Resource": "*",
            "Condition": {
                "StringEquals": {
                    "aws:RequestedRegion": [
                        "us-east-1",
                        "us-west-2",
                        "us-east-2"
                        ]
                    }
                }
        }
    ]
};

const customPolicyDocument = iam.PolicyDocument.fromJson(policyDocument);

export class PermissionBoundary extends cdk.Construct {
	constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id);
    
    iam.PermissionsBoundary.of(stack).apply(customPolicyDocument)
    }

}