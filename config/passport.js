const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const bcrypt = require('bcryptjs'); // Ajout nécessaire

passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await User.findOne({ where: { username } });
      if (!user) {
        return done(null, false, { message: 'Utilisateur non trouvé.' });
      }
      
      // Utilisation de bcrypt pour comparer les mots de passe
      const isValidPassword = bcrypt.compareSync(password, user.password);
      if (!isValidPassword) {
        return done(null, false, { message: 'Mot de passe incorrect.' });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));



passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});