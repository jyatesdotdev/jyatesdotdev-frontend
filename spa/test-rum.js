const { AwsRum } = require('aws-rum-web');
const rum = new AwsRum('app-id', '1.0', 'us-east-1', {
  endpoint: 'http://localhost:5173/api/v1/telemetry',
  identityPoolId: 'us-east-1:123',
  guestRoleArn: 'arn:aws:iam::123:role/123'
});
console.log(rum);
