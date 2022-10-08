import {
  Stack,
  StackProps,
  CfnDynamicReference,
  CfnDynamicReferenceService,
  aws_iam as iam,
  aws_ec2 as ec2,
  aws_secretsmanager as secretsmanager,
  aws_fsx as fsx,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class FsxForOntapWindowsClientStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // SSM IAM Role
    const ssmIamRole = new iam.Role(this, "SSM IAM Role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ],
    });

    // VPC
    const vpc = new ec2.Vpc(this, "VPC", {
      cidr: "10.0.1.0/24",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 0,
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 27,
        },
        {
          name: "Isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 27,
        },
      ],
    });

    // EC2 Instance
    const instance = new ec2.Instance(this, "Windows EC2 Instance", {
      instanceType: new ec2.InstanceType("t3.micro"),
      machineImage: ec2.MachineImage.latestWindows(
        ec2.WindowsVersion.WINDOWS_SERVER_2022_ENGLISH_FULL_BASE
      ),
      vpc,
      blockDevices: [
        {
          deviceName: "/dev/sda1",
          volume: ec2.BlockDeviceVolume.ebs(30, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
      propagateTagsToVolumeOnCreation: true,
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PUBLIC,
      }),
      role: ssmIamRole,
    });

    // Security Group used by FSx for ONTAP file system
    const fileSystemSecurityGroup = new ec2.SecurityGroup(
      this,
      "Security Group of FSx for ONTAP file system",
      {
        vpc,
      }
    );

    // Ref : https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/limit-access-security-groups.html
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.icmpPing(),
      "Pinging the instance"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(22),
      "SSH access to the IP address of the cluster management LIF or a node management LIF"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(111),
      "Remote procedure call for NFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(135),
      "Remote procedure call for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(139),
      "NetBIOS service session for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcpRange(161, 162),
      "Simple network management protocol (SNMP)"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      "ONTAP REST API access to the IP address of the cluster management LIF or an SVM management LIF"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(445),
      "Microsoft SMB/CIFS over TCP with NetBIOS framing"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(635),
      "NFS mount"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(749),
      "Kerberos"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(2049),
      "NFS server daemon"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(3260),
      "iSCSI access through the iSCSI data LIF"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(4045),
      "NFS lock daemon"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(4046),
      "Network status monitor for NFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(10000),
      "Network data management protocol (NDMP) and NetApp SnapMirror intercluster communication"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(11104),
      "Management of NetApp SnapMirror intercluster communication"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(11105),
      "SnapMirror data transfer using intercluster LIFs"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.udp(111),
      "Remote procedure call for NFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.udp(135),
      "Remote procedure call for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.udp(137),
      "NetBIOS name resolution for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.udp(139),
      "NetBIOS service session for CIFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.udpRange(161, 162),
      "Simple network management protocol (SNMP)"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.udp(635),
      "NFS mount"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.udp(2049),
      "NFS server daemon"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.udp(4045),
      "NFS lock daemon"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.udp(4046),
      "Network status monitor for NFS"
    );
    fileSystemSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.udp(4049),
      "NFS quota protocol"
    );

    // Secret of FSx for ONTAP file system
    const fileSystemSecret = new secretsmanager.Secret(
      this,
      "Secret of FSx for ONTAP file system",
      {
        secretName: "/fsx-for-ontap/file-system/fsxadmin",
        generateSecretString: {
          generateStringKey: "password",
          passwordLength: 32,
          requireEachIncludedType: true,
          secretStringTemplate: '{"username": "fsxadmin"}',
        },
      }
    );

    // FSx for ONTAP file system
    const fsxForOntapFileSystem = new fsx.CfnFileSystem(
      this,
      "FSx for ONTAP file system",
      {
        fileSystemType: "ONTAP",
        subnetIds: vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }).subnetIds,
        ontapConfiguration: {
          deploymentType: "SINGLE_AZ_1",
          automaticBackupRetentionDays: 7,
          dailyAutomaticBackupStartTime: "16:00",
          diskIopsConfiguration: {
            mode: "AUTOMATIC",
          },
          fsxAdminPassword: new CfnDynamicReference(
            CfnDynamicReferenceService.SECRETS_MANAGER,
            `${fileSystemSecret.secretArn}:SecretString:password`
          ).toString(),
          throughputCapacity: 128,
          weeklyMaintenanceStartTime: "6:17:00",
        },
        securityGroupIds: [fileSystemSecurityGroup.securityGroupId],
        storageCapacity: 1024,
        storageType: "SSD",
        tags: [
          {
            key: "Name",
            value: "fsx-for-ontap-file-system",
          },
        ],
      }
    );

    // FSx for ONTAP SVM
    const svmName = "fsx-for-ontap-svm";
    const svm = new fsx.CfnStorageVirtualMachine(this, "SVM", {
      fileSystemId: fsxForOntapFileSystem.ref,
      name: svmName,
      rootVolumeSecurityStyle: "MIXED",
      tags: [
        {
          key: "Name",
          value: svmName,
        },
      ],
    });

    // FSX for ONTAP volume
    const volumeName = "fsx_for_ontap_volume";
    const junctionPath = "/volume";
    new fsx.CfnVolume(this, "Volume", {
      name: volumeName,
      ontapConfiguration: {
        junctionPath,
        sizeInMegabytes: "102400",
        storageEfficiencyEnabled: "true",
        storageVirtualMachineId: svm.ref,
        securityStyle: "NTFS",
        tieringPolicy: {
          coolingPeriod: 31,
          name: "AUTO",
        },
      },
      tags: [
        {
          key: "Name",
          value: volumeName,
        },
      ],
      volumeType: "ONTAP",
    });
  }
}
