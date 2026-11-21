# Deployment plan

This document will be completed as the application architecture is implemented.

The production plan must address 100,000 registered users, approximately 10,000 daily active users, and peak issuance of approximately 30,000 certificates and notifications in an hour.

Planned topics:
- Architecture and event flow
- Hosting choices
- Horizontal scaling and queue throughput
- Worker crash, Redis restart, provider outage, and slow database recovery
- Certificate storage and access control
- Monitoring, alerting, estimated monthly cost, and trade-offs
