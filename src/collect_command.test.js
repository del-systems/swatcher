beforeEach(jest.resetModules)
beforeEach(jest.clearAllMocks)

function collectCommand() { require("./collect_command.js").default(arguments) }

it("should check for aws configuration and throw an error if configuration isnt ready", () => {
    jest.mock("./s3_credentials.js", () => jest.fn(
        () => ({ isConfigReady: false })
    ))

    expect(collectCommand).toThrowError()
})

it("should create a new AWS endpoint when configuration is ready", () => {
    jest.mock("aws-sdk", () => ({
        Endpoint: jest.fn(),
        S3: jest.fn()
    }))

    jest.mock("./s3_credentials.js", () => jest.fn(
        () => ({ isConfigReady: true, endpoint: 'aws_endpoint', accessKey: 'aws_key', secretKey: 'secret' })
    ))

    let aws = require("aws-sdk")
    let s3cred = require("./s3_credentials.js")

    collectCommand()

    expect(s3cred).toHaveBeenCalledTimes(1)
    expect(aws.Endpoint).toHaveBeenCalledWith("aws_endpoint")
    expect(aws.S3).toHaveBeenCalledWith({
        endpoint: aws.Endpoint.mock.instances[0],
        accessKeyId: "aws_key",
        secretAccessKey: "secret"
    })
})
