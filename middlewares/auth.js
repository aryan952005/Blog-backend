// =============================================================
//  middlewares/auth.js — JWT Authentication Middleware
// =============================================================
//
//  THE BIG PICTURE — WHY DO WE NEED AUTH MIDDLEWARE?
//  -------------------------------------------------
//
//  Some routes are PUBLIC (anyone can access):
//    GET /posts          → Browse posts
//    POST /auth/login    → Log in
//    POST /auth/register → Sign up
//
//  Some routes are PROTECTED (only logged-in users):
//    POST /posts         → Create a post (who's the author?)
//    DELETE /posts/:id   → Delete a post (is this YOUR post?)
//    POST /comments      → Add a comment (who's commenting?)
//
//  For protected routes, we need to:
//    1. Verify the user is logged in (has a valid token)
//    2. Know WHO they are (attach user info to the request)
//
//  WITHOUT middleware, you'd repeat this in every controller:
//
//    const createPost = async (req, res) => {
//      const token = req.headers.authorization?.split(" ")[1];
//      const decoded = jwt.verify(token, process.env.JWT_SECRET);
//      const user = await User.findById(decoded.id);
//      if (!user) { ... }
//      // NOW you can create the post
//    };
//
//  WITH middleware, you write this logic ONCE:
//
//    router.post("/posts", auth, createPost);
//                          ^^^^ 
//               This runs BEFORE createPost.
//               By the time createPost runs,
//               req.user is already available!
//
//  HOW JWT (JSON Web Token) AUTHENTICATION WORKS:
//  -----------------------------------------------
//
//  1. USER LOGS IN:
//     Client sends: POST /auth/login { email, password }
//     Server verifies credentials
//     Server creates a JWT: jwt.sign({ id: user._id }, SECRET)
//     Server sends JWT back to client
//
//  2. CLIENT STORES TOKEN:
//     Usually in localStorage or a cookie
//
//  3. CLIENT SENDS TOKEN WITH EVERY REQUEST:
//     Authorization: "Bearer eyJhbGciOiJIUzI1NiIs..."
//                     ^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^
//                     prefix      the actual JWT
//
//  4. THIS MIDDLEWARE VERIFIES THE TOKEN:
//     Extracts token → Verifies signature → Finds user → Attaches to req
//
//  WHY "Bearer"?
//  -------------
//  "Bearer" is a standard prefix defined in RFC 6750. It means
//  "whoever bears (carries) this token is authorized." It's just
//  a convention so servers know what type of auth is being used.
//  (Other types: "Basic" for username:password, "Digest", etc.)
//
// =============================================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const auth = async (req, res, next) => {
    try {
        // ---------------------------------------------------------
        //  STEP 1: Extract the token from the Authorization header
        // ---------------------------------------------------------
        //  The header looks like: "Bearer eyJhbGciOiJIUzI1NiIs..."
        //
        //  req.headers.authorization → "Bearer eyJhbGciOiJIUzI1NiIs..."
        //
        //  We need to:
        //    a) Check if the header exists at all
        //    b) Check if it starts with "Bearer "
        //    c) Extract just the token part (after "Bearer ")
        //
        //  WHY check for both conditions?
        //    - No header at all → user didn't send any auth
        //    - Header without "Bearer" → wrong format
        //    - Both cases = unauthorized
        // ---------------------------------------------------------
        const authHeader = req.cookies.accessToken;
        console.log("authheader", authHeader)
        if (!authHeader) {
            throw new ApiError(401, "Access denied. No token provided.");
            // 401 = Unauthorized: "I don't know who you are"
            // (vs 403 = Forbidden: "I know who you are, but you can't do this")
        }

        // "Bearer eyJhbGciOi...".split(" ") → ["Bearer", "eyJhbGciOi..."]
        // [1] gets the token part
        const token = authHeader;

        // ---------------------------------------------------------
        //  STEP 2: Verify the token
        // ---------------------------------------------------------
        //  jwt.verify() does TWO things:
        //
        //    a) CHECKS THE SIGNATURE: The JWT was signed with
        //       JWT_SECRET when created. verify() re-signs and
        //       compares. If someone tampered with the token,
        //       the signatures won't match → throws an error.
        //
        //    b) CHECKS EXPIRATION: If the token has an `exp` claim
        //       and it's past the expiry time → throws "jwt expired".
        //
        //  If verification succeeds, it returns the DECODED PAYLOAD:
        //    { id: "64f8a9b2c3d4e5f6a7b8c9d0", iat: 1234567890, exp: ... }
        //
        //  `id` is what we put in the token during login:
        //    jwt.sign({ id: user._id }, SECRET)
        //
        //  WHY do we need JWT_SECRET?
        //    It's like a password for your server. Only YOUR server
        //    knows this secret, so only YOUR server can create and
        //    verify tokens. If someone tries to forge a token without
        //    the secret, jwt.verify() will reject it.
        // ---------------------------------------------------------
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ---------------------------------------------------------
        //  STEP 3: Find the user in the database
        // ---------------------------------------------------------
        //  WHY look up the user again? Can't we just trust the token?
        //
        //  The token only contains the user's ID (and maybe some
        //  basic claims). But we need the FULL user object for:
        //    - Checking if the user still exists (maybe deleted?)
        //    - Getting current user data (name, email, role)
        //    - Making it available to controllers via req.user
        //
        //  .select("-password") excludes the password field from
        //  the result. Even though it's hashed, there's no reason
        //  to carry it around in memory. Security best practice:
        //  NEVER include passwords in objects that get passed around.
        // ---------------------------------------------------------
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            throw new ApiError(401, "Token is valid but user no longer exists.");
            // This can happen if: user was deleted after they got a token,
            // or the token was crafted with a non-existent user ID
        }

        // ---------------------------------------------------------
        //  STEP 4: Attach user to the request object
        // ---------------------------------------------------------
        //  This is the KEY step. By setting req.user, every
        //  subsequent middleware and controller in the chain can
        //  access the authenticated user:
        //
        //    // In createPost controller:
        //    const post = new Post({
        //      title: req.body.title,
        //      author: req.user._id,  // ← We know who's creating this!
        //    });
        //
        //    // In deletePost controller:
        //    if (post.author.toString() !== req.user._id.toString()) {
        //      throw new ApiError(403, "You can only delete your own posts");
        //    }
        //
        //  The `req` object is shared across the middleware chain,
        //  so attaching data to it is the standard Express pattern
        //  for passing data between middleware functions.
        // ---------------------------------------------------------
        req.user = user;

        // ---------------------------------------------------------
        //  STEP 5: Pass control to the next middleware/controller
        // ---------------------------------------------------------
        //  next() tells Express: "I'm done, move to the next
        //  function in the chain." Without this, the request
        //  would hang forever.
        //
        //  Request flow:  auth middleware → next() → controller
        //                                           (req.user is available!)
        // ---------------------------------------------------------
        next();

    } catch (error) {
        // ---------------------------------------------------------
        //  Error Handling
        // ---------------------------------------------------------
        //  If jwt.verify() fails, it throws specific errors:
        //
        //  - "jwt malformed"        → token format is invalid
        //  - "jwt expired"          → token has expired
        //  - "invalid signature"    → token was tampered with
        //  - "jwt must be provided" → empty string passed
        //
        //  If it's already our ApiError (from steps 1 or 3),
        //  we pass it along. Otherwise, we wrap the JWT error
        //  in our ApiError with 401 status.
        //
        //  WHY pass to next(error) instead of res.json()?
        //    Because we have a centralized errorHandler middleware!
        //    Let IT handle the formatting. Consistency everywhere.
        // ---------------------------------------------------------
        if (error instanceof ApiError) {
            next(error);  // Already has statusCode, pass to errorHandler
        } else {
            next(new ApiError(401, "Invalid or expired token."));
        }
    }
};

module.exports = auth;

// =============================================================
//  HOW THIS MIDDLEWARE FITS INTO ROUTES:
//
//  // Public routes (no auth needed)
//  router.get("/posts", getAllPosts);
//  router.post("/auth/login", login);
//
//  // Protected routes (auth middleware runs first)
//  router.post("/posts", auth, createPost);
//                        ^^^^
//  Express runs middleware LEFT → RIGHT:
//    1. auth runs → verifies token → sets req.user → calls next()
//    2. createPost runs → uses req.user to know who's creating
//
//  If auth fails, it calls next(error), and Express skips
//  createPost entirely, jumping to the errorHandler.
//
//  FULL REQUEST LIFECYCLE:
//  -----------------------
//  Client sends: POST /posts
//  Headers: { Authorization: "Bearer eyJ..." }
//  Body: { title: "My Post", content: "Hello!" }
//
//    ① auth middleware extracts "eyJ..."
//    ② jwt.verify() decodes → { id: "64f8..." }
//    ③ User.findById("64f8...") → { _id, firstName, email, ... }
//    ④ req.user = user
//    ⑤ next() → createPost controller
//    ⑥ Controller reads req.user._id → saves as post.author
//    ⑦ Response: { success: true, data: post }
// =============================================================
