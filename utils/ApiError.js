// =============================================================
//  utils/ApiError.js — Custom Error Class
// =============================================================
//
//  WHY DO WE NEED THIS?
//  --------------------
//  JavaScript's built-in Error class only carries a `message`.
//  But in a REST API, every error response also needs an HTTP
//  status code (404, 400, 401, 500, etc.).
//
//  Without this class, you'd have to do something ugly like:
//
//      res.status(404).json({ message: "Post not found" });
//      return;   // don't forget this or code keeps running!
//
//  ...scattered across EVERY controller function. That means:
//    1. You repeat status code + response logic everywhere
//    2. If you forget `return`, the code keeps executing
//    3. You can't throw errors from helper/service functions
//       because they don't have access to `res`
//
//  WITH this class, you can simply do:
//
//      throw new ApiError(404, "Post not found");
//
//  ...from ANYWHERE (controllers, services, validators), and
//  the centralized errorHandler middleware catches it and sends
//  the proper HTTP response. Clean, consistent, DRY.
//
// =============================================================

class ApiError extends Error {
    /**
     * @param {number} statusCode - HTTP status code (e.g., 400, 401, 404, 500)
     * @param {string} message    - Human-readable error description
     *
     * HOW INHERITANCE WORKS HERE:
     * ---------------------------
     * 1. `extends Error`  → ApiError IS an Error (instanceof check works)
     * 2. `super(message)` → Calls Error's constructor, which sets:
     *      - this.message = message
     *      - this.stack   = (the stack trace, automatically captured)
     * 3. `this.statusCode = statusCode` → OUR addition: the HTTP status code
     *
     * Now when this error is caught by the errorHandler middleware,
     * it can read `err.statusCode` to know what HTTP status to send,
     * and `err.message` to know what message to include in the response.
     */
    constructor(statusCode, message) {
        super(message);          // Sets this.message AND captures stack trace
        this.statusCode = statusCode;  // Our custom property — the HTTP status
    }
}

module.exports = ApiError;

// =============================================================
//  USAGE EXAMPLES (for reference):
//
//  throw new ApiError(400, "Email is required");
//  throw new ApiError(401, "Invalid credentials");
//  throw new ApiError(403, "You can only delete your own posts");
//  throw new ApiError(404, "Post not found");
//  throw new ApiError(409, "Email already registered");
//
//  COMMON HTTP STATUS CODES:
//  -------------------------
//  400 → Bad Request      (invalid input, missing fields)
//  401 → Unauthorized     (not logged in, bad token)
//  403 → Forbidden        (logged in but not allowed)
//  404 → Not Found        (resource doesn't exist)
//  409 → Conflict         (duplicate resource, e.g., email)
//  500 → Internal Server  (unexpected server crash)
// =============================================================
