import mockedEnv from "mocked-env"

it("should create a new AWS endpoint", () => {
    let resetEnv = mockedEnv({
        AWS_ENDPOINT: "aws_endpoint",
        AWS_ACCESS_KEY: "aws_key",
        AWS_SECRET_KEY: "secret"
    })
    afterEach(resetEnv);

    let aws = require("aws-sdk");
    jest.mock("aws-sdk", () => { 
        return { 
            Endpoint: jest.fn(),
            S3: jest.fn() 
        } 
    })
    
    require("./index.js")

    expect(aws.Endpoint).toHaveBeenCalledWith("aws_endpoint")
    expect(aws.S3).toHaveBeenCalledWith({
        endpoint: aws.Endpoint.mock.instances[0],
        accessKeyId: "aws_key",
        secretAccessKey: "secret"
    })
})
