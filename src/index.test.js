it("should check for aws configuration", () => {
    jest.mock("./s3_credentials.js", () => jest.fn(
        () => ({ isConfigReady: false })
    ))

    expect(() => require("./index.js")).toThrowError()
})

it("should create a new AWS endpoint", () => {
    jest.mock("aws-sdk", () => ({
        Endpoint: jest.fn(),
        S3: jest.fn()
    }))

    jest.mock("./s3_credentials.js", () => jest.fn(
        () => ({ isConfigReady: true, endpoint: 'aws_endpoint', accessKey: 'aws_key', secretKey: 'secret' })
    ))

    let aws = require("aws-sdk")
    let s3cred = require("./s3_credentials.js")

    require("./index.js")

    expect(s3cred).toHaveBeenCalledTimes(1)
    expect(aws.Endpoint).toHaveBeenCalledWith("aws_endpoint")
    expect(aws.S3).toHaveBeenCalledWith({
        endpoint: aws.Endpoint.mock.instances[0],
        accessKeyId: "aws_key",
        secretAccessKey: "secret"
    })
})
