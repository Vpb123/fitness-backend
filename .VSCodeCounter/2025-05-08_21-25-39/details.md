# Details

Date : 2025-05-08 21:25:39

Directory e:\\MSc in Computer Science\\Web and Cloud Dev\\fitness-backend\\src

Total : 58 files,  3664 codes, 224 comments, 730 blanks, all 4618 lines

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [src/app.js](/src/app.js) | JavaScript | 38 | 13 | 14 | 65 |
| [src/config/config.js](/src/config/config.js) | JavaScript | 69 | 0 | 6 | 75 |
| [src/config/logger.js](/src/config/logger.js) | JavaScript | 23 | 0 | 4 | 27 |
| [src/config/passport.js](/src/config/passport.js) | JavaScript | 105 | 0 | 13 | 118 |
| [src/config/roles.js](/src/config/roles.js) | JavaScript | 10 | 0 | 3 | 13 |
| [src/config/tokens.js](/src/config/tokens.js) | JavaScript | 9 | 0 | 2 | 11 |
| [src/controllers/admin.controller.js](/src/controllers/admin.controller.js) | JavaScript | 63 | 0 | 16 | 79 |
| [src/controllers/auth.controller.js](/src/controllers/auth.controller.js) | JavaScript | 91 | 0 | 21 | 112 |
| [src/controllers/index.js](/src/controllers/index.js) | JavaScript | 2 | 0 | 1 | 3 |
| [src/controllers/member.controller.js](/src/controllers/member.controller.js) | JavaScript | 111 | 0 | 29 | 140 |
| [src/controllers/notification.controller.js](/src/controllers/notification.controller.js) | JavaScript | 30 | 0 | 13 | 43 |
| [src/controllers/trainer.controller.js](/src/controllers/trainer.controller.js) | JavaScript | 212 | 0 | 59 | 271 |
| [src/controllers/user.controller.js](/src/controllers/user.controller.js) | JavaScript | 93 | 0 | 23 | 116 |
| [src/cron/sessionUpdater.js](/src/cron/sessionUpdater.js) | JavaScript | 59 | 0 | 10 | 69 |
| [src/index.js](/src/index.js) | JavaScript | 35 | 0 | 5 | 40 |
| [src/middlewares/auth.js](/src/middlewares/auth.js) | JavaScript | 26 | 0 | 6 | 32 |
| [src/middlewares/error.js](/src/middlewares/error.js) | JavaScript | 36 | 1 | 8 | 45 |
| [src/middlewares/rateLimiter.js](/src/middlewares/rateLimiter.js) | JavaScript | 9 | 0 | 3 | 12 |
| [src/middlewares/validate.js](/src/middlewares/validate.js) | JavaScript | 18 | 0 | 4 | 22 |
| [src/models/admin.model.js](/src/models/admin.model.js) | JavaScript | 24 | 0 | 5 | 29 |
| [src/models/index.js](/src/models/index.js) | JavaScript | 11 | 0 | 2 | 13 |
| [src/models/member.model.js](/src/models/member.model.js) | JavaScript | 49 | 0 | 6 | 55 |
| [src/models/notification.model.js](/src/models/notification.model.js) | JavaScript | 51 | 0 | 9 | 60 |
| [src/models/plugins/index.js](/src/models/plugins/index.js) | JavaScript | 2 | 0 | 1 | 3 |
| [src/models/plugins/paginate.plugin.js](/src/models/plugins/paginate.plugin.js) | JavaScript | 44 | 19 | 8 | 71 |
| [src/models/plugins/toJSON.plugin.js](/src/models/plugins/toJSON.plugin.js) | JavaScript | 31 | 6 | 7 | 44 |
| [src/models/token.model.js](/src/models/token.model.js) | JavaScript | 36 | 4 | 5 | 45 |
| [src/models/trainer.model.js](/src/models/trainer.model.js) | JavaScript | 84 | 0 | 10 | 94 |
| [src/models/trainerRequest.model.js](/src/models/trainerRequest.model.js) | JavaScript | 45 | 1 | 5 | 51 |
| [src/models/trainerReview.model.js](/src/models/trainerReview.model.js) | JavaScript | 46 | 2 | 8 | 56 |
| [src/models/trainingCenter.model.js](/src/models/trainingCenter.model.js) | JavaScript | 67 | 0 | 5 | 72 |
| [src/models/trainingSession.model.js](/src/models/trainingSession.model.js) | JavaScript | 71 | 1 | 5 | 77 |
| [src/models/user.model.js](/src/models/user.model.js) | JavaScript | 111 | 3 | 18 | 132 |
| [src/models/workoutPlan.model.js](/src/models/workoutPlan.model.js) | JavaScript | 74 | 0 | 7 | 81 |
| [src/routes/v1/admin.route.js](/src/routes/v1/admin.route.js) | JavaScript | 13 | 0 | 5 | 18 |
| [src/routes/v1/auth.route.js](/src/routes/v1/auth.route.js) | JavaScript | 31 | 0 | 5 | 36 |
| [src/routes/v1/index.js](/src/routes/v1/index.js) | JavaScript | 39 | 0 | 7 | 46 |
| [src/routes/v1/member.route.js](/src/routes/v1/member.route.js) | JavaScript | 18 | 0 | 3 | 21 |
| [src/routes/v1/notification.route.js](/src/routes/v1/notification.route.js) | JavaScript | 9 | 0 | 4 | 13 |
| [src/routes/v1/trainer.route.js](/src/routes/v1/trainer.route.js) | JavaScript | 27 | 0 | 3 | 30 |
| [src/routes/v1/user.route.js](/src/routes/v1/user.route.js) | JavaScript | 13 | 3 | 5 | 21 |
| [src/services/admin.service.js](/src/services/admin.service.js) | JavaScript | 191 | 2 | 33 | 226 |
| [src/services/auth.service.js](/src/services/auth.service.js) | JavaScript | 57 | 22 | 10 | 89 |
| [src/services/email.service.js](/src/services/email.service.js) | JavaScript | 48 | 34 | 7 | 89 |
| [src/services/index.js](/src/services/index.js) | JavaScript | 8 | 0 | 0 | 8 |
| [src/services/member.service.js](/src/services/member.service.js) | JavaScript | 306 | 19 | 74 | 399 |
| [src/services/notification.service.js](/src/services/notification.service.js) | JavaScript | 47 | 0 | 15 | 62 |
| [src/services/token.service.js](/src/services/token.service.js) | JavaScript | 63 | 28 | 11 | 102 |
| [src/services/trainer.service.js](/src/services/trainer.service.js) | JavaScript | 527 | 24 | 102 | 653 |
| [src/services/user.service.js](/src/services/user.service.js) | JavaScript | 153 | 35 | 32 | 220 |
| [src/utils/ApiError.js](/src/utils/ApiError.js) | JavaScript | 13 | 0 | 2 | 15 |
| [src/utils/catchAsync.js](/src/utils/catchAsync.js) | JavaScript | 4 | 0 | 2 | 6 |
| [src/utils/pick.js](/src/utils/pick.js) | JavaScript | 9 | 7 | 2 | 18 |
| [src/utils/trainerAvailibility.js](/src/utils/trainerAvailibility.js) | JavaScript | 166 | 0 | 43 | 209 |
| [src/validations/auth.validation.js](/src/validations/auth.validation.js) | JavaScript | 68 | 0 | 13 | 81 |
| [src/validations/custom.validation.js](/src/validations/custom.validation.js) | JavaScript | 19 | 0 | 3 | 22 |
| [src/validations/index.js](/src/validations/index.js) | JavaScript | 2 | 0 | 1 | 3 |
| [src/validations/user.validation.js](/src/validations/user.validation.js) | JavaScript | 48 | 0 | 7 | 55 |

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)