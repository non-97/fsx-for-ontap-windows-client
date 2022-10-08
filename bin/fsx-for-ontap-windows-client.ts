#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { FsxForOntapWindowsClientStack } from "../lib/fsx-for-ontap-windows-client-stack";

const app = new cdk.App();
new FsxForOntapWindowsClientStack(app, "FsxForOntapWindowsClientStack");
