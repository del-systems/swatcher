import AWS from "aws-sdk"

const s3 = new AWS.S3({
    endpoint: new AWS.Endpoint(process.env["AWS_ENDPOINT"]),
    accessKeyId: process.env["AWS_ACCESS_KEY"],
    secretAccessKey: process.env["AWS_SECRET_KEY"]
});

