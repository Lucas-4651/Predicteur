process.removeAllListeners('warning');

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
 require('./config/passport'); // Chemin vers ton fichier de config passport
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const flash = require('express-flash');
const logger = require('./middlewares/logger');
const adminController = require('./controllers/adminController'); // Import ajouté ici

const app = express();

// Configuration de SQLite
const sequelize = require('./config/database');

// Tester la connexion et synchroniser les modèles
sequelize.authenticate()
  .then(() => {
    logger.info('Connexion à SQLite établie.');
    return sequelize.sync();
  })
  .catch(err => {
    logger.error('Erreur SQLite: ' + err);
  });

// Middlewares
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Configuration de session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Flash messages
app.use(flash());

// Initialisation de Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware pour passer les variables aux vues
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.messages = req.flash();
  res.locals.copyright = "Lucas46Modder Madagascar 2025";
  next();
});

// Limitation de débit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});
app.use('/api/', apiLimiter);

// Routes
app.use('/', require('./routes/web'));
app.use('/api', require('./routes/api'));
app.use('/admin', require('./routes/admin'));

// Middleware d'erreur
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).render('error', { 
    message: 'Erreur serveur',
    user: req.user
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Serveur démarré sur le port ${PORT}`);
});

// Planifier la vérification quotidienne des clés expirées
setInterval(async () => {
  const revokedCount = await adminController.revokeExpiredKeys();
  if (revokedCount > 0) {
    logger.info(`${revokedCount} clés API expirées ont été révoquées`);
  }
}, 24 * 60 * 60 * 1000); // Tous les jours