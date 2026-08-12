const passport = require("passport");

const authJwt = passport.authenticate("jwt", { session: false });

function checkRole(roles) {
  return (req, res, next) => {
    const { user } = req;
    if (user && user.role && roles.includes(user.role)) {
      return next();
    }
    return res.status(403).json({ error: "Forbidden: role not allowed" });
  };
}

module.exports = { authJwt, checkRole };