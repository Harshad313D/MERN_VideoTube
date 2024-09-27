class ApiError extends Error {
    constructor(
        statusCode,
        message="oops! Something went wrong",
        errors=[],
        stack = ""
    ){
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.errors = errors;
        this.success = false;
        this.stack = stack;

        if (stack) {
            this.stack = stack;
        } else{
            Error.captureStackTrace(this, this.constructor);
        }

    }
};

export { ApiError }