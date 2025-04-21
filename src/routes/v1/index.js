const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const config = require('../../config/config');
const memberRoute = require('./member.route');
const trainerRoute = require('./trainer.route');
const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/members',
    route: memberRoute,
  },
  {
    path:'/trainers',
    route: trainerRoute,
  }
  
];


defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});


module.exports = router;
