// =============================================================
//  middlewares/errorHandler.js — Centralized Error Handler
// =============================================================
//
//  THE BIG PICTURE — WHY CENTRALIZED ERROR HANDLING?
//  -------------------------------------------------
//
//  Without this, EVERY controller would need its own try-catch:
//
//    const createPost = async (req, res) => {
//      try {
//        // ... logic
//      } catch (error) {
//        if (error.name === "ValidationError") {
//          res.status(400).json({ message: error.message });
//        } else if (error.code === 11000) {
//          res.status(409).json({ message: "Duplicate!" });
//        } else {
//          res.status(500).json({ message: "Server error" });
//        }
//      }
//    };
//
//  Now imagine doing this in 20+ controllers. That's:
//    ❌ Tons of duplicated error-handling code
//    ❌ Inconsistent error response formats
//    ❌ Easy to forget handling specific error types
//    ❌ A nightmare to maintain
//
//  WITH a centralized error handler:
//    ✅ Write error handling logic ONCE
//    ✅ Every error response has the SAME structure
//    ✅ Controllers just throw errors; this catches them ALL
//    ✅ One place to add logging, monitoring, etc.
//
//  HOW EXPRESS ERROR HANDLING WORKS:
//  ---------------------------------
//
//  Express recognizes a middleware as an "error handler" when
//  it has EXACTLY 4 parameters: (err, req, res, next)
//
//  Whenever you call next(error) or an async error is thrown,
//  Express SKIPS all normal middleware and jumps straight to
//  the error handler. Think of it like a safety net:
//
//    Request → Route → Controller → (error thrown!)
//                                        ↓
//                              Express skips everything
//                                        ↓
//                              errorHandler(err, req, res, next)
//                                        ↓
//                              { success: false, message: "..." }
//
//  IMPORTANT: This middleware must be registered LAST in server.js
//  (after all routes), because Express error handlers only catch
//  errors from middleware/routes defined BEFORE them.
//
// =============================================================

const errorHandler = (err, req, res, next) => {
    // ---------------------------------------------------------
    //  STEP 1: Set defaults
    // ---------------------------------------------------------
    //  If the error is our custom ApiError, it will have a
    //  statusCode. If it's some unexpected crash (like a null
    //  pointer), it won't have one — default to 500 (server error).
    //
    //  We clone statusCode and message so we can modify them
    //  based on specific error types without mutating the
    //  original error object.
    // ---------------------------------------------------------
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // ---------------------------------------------------------
    //  STEP 2: Handle Mongoose-specific errors
    // ---------------------------------------------------------
    //  Mongoose throws specific error types that aren't HTTP-aware.
    //  We translate them into proper HTTP status codes & messages.
    //
    //  WHY? Because without this, a Mongoose ValidationError would
    //  result in a generic 500 error, confusing the client.
    //  Instead, we map each error to the correct status code.
    // ---------------------------------------------------------

    // --- VALIDATION ERROR (e.g., missing required field, too long, etc.) ---
    //
    //  When does this happen?
    //    User tries to create a post without a title, or sends a
    //    name longer than 50 characters. Mongoose validates against
    //    your schema rules and throws a ValidationError.
    //
    //  What does it look like?
    //    err.name = "ValidationError"
    //    err.errors = {
    //      title: { message: "Title is required" },
    //      content: { message: "Content is required" }
    //    }
    //
    //  What we do:
    //    Extract ALL validation messages and join them into one string.
    //    Return 400 (Bad Request) — it's the CLIENT's fault.
    //
    if (err.name === "ValidationError") {
        statusCode = 400;
        // Object.values(err.errors) gives us all the error objects
        // .map(e => e.message) extracts just the message strings
        // .join(", ") combines them: "Title is required, Content is required"
        message = Object.values(err.errors)
            .map((e) => e.message)
            .join(", ");
    }

    // --- DUPLICATE KEY ERROR (e.g., email already registered) ---
    //
    //  When does this happen?
    //    User tries to register with an email that already exists.
    //    MongoDB enforces the `unique: true` constraint and throws
    //    an error with code 11000.
    //
    //  What does it look like?
    //    err.code = 11000
    //    err.keyValue = { email: "john@example.com" }
    //
    //  What we do:
    //    Extract the field name that caused the conflict (e.g., "email")
    //    Return 409 (Conflict) — the resource already exists.
    //
    //  WHY 409 and not 400?
    //    400 means "your request format is wrong"
    //    409 means "your request conflicts with existing data"
    //    Semantically, duplicate key IS a conflict.
    //
    if (err.code === 11000) {
        statusCode = 409;
        // Object.keys(err.keyValue) gives ["email"] (the duplicated field)
        const field = Object.keys(err.keyValue).join(", ");
        message = `Duplicate value for field: ${field}. Please use a different value.`;
    }

    // --- CAST ERROR (e.g., invalid ObjectId format) ---
    //
    //  When does this happen?
    //    Client sends a URL like /posts/not-a-real-id
    //    Mongoose tries to cast "not-a-real-id" to an ObjectId
    //    and fails because ObjectIds are specific 24-char hex strings.
    //
    //  What does it look like?
    //    err.name = "CastError"
    //    err.path = "_id"
    //    err.value = "not-a-real-id"
    //
    //  What we do:
    //    Return 400 (Bad Request) with a clear message about
    //    which field has an invalid format.
    //
    if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid value for ${err.path}: "${err.value}". Expected a valid ObjectId.`;
    }

    // ---------------------------------------------------------
    //  STEP 3: Log the error (for debugging in development)
    // ---------------------------------------------------------
    //  We log errors server-side so developers can debug issues.
    //  In production, you'd send this to a logging service
    //  (like Winston, Sentry, Datadog) instead of console.error.
    // ---------------------------------------------------------
    console.error(`❌ [${statusCode}] ${message}`);
    // Log stack trace only in development for debugging
    if (process.env.NODE_ENV !== "production") {
        console.error(err.stack);
    }

    // ---------------------------------------------------------
    //  STEP 4: Send consistent error response
    // ---------------------------------------------------------
    //  EVERY error response from your API will have this exact shape:
    //
    //    {
    //      success: false,
    //      message: "Human-readable error description"
    //    }
    //
    //  WHY `success: false`?
    //    So the frontend can ALWAYS check `response.success` to
    //    know if the request worked, regardless of the HTTP status.
    //    Consistent. Predictable. Easy to handle.
    // ---------------------------------------------------------
    res.status(statusCode).json({
        success: false,
        message: message,
    });
};

module.exports = errorHandler;

// =============================================================
//  SUMMARY OF ERROR MAPPING:
//
//  Error Type        │ HTTP Status │ Meaning
//  ─────────────────────────────────────────────────────────
//  ValidationError   │ 400         │ Schema validation failed
//  CastError         │ 400         │ Invalid ObjectId format
//  Duplicate (11000) │ 409         │ Unique constraint violated
//  ApiError          │ (custom)    │ Your own thrown errors
//  Unknown           │ 500         │ Unexpected server crash
// =============================================================
