const Umzug = require('umzug');
const Sequelize = require('Sequelize');

module.exports = function KoalaSequelize(gulp, options, argv, app) {

  gulp.task("generate:migration", function(done){
    var yeoman = require('yeoman-environment');
    var env = yeoman.createEnv();
    var generator = require('./generators/generate-migration');
    env.registerStub(generator, 'generate:migration');

    if ( !options._.length ) {
      env.run(`generate:migration --help`, done);
      return;
    }
    env.run(`generate:migration ${argv}`, done);
  })

  if ( app.env !== "production" ) {
      gulp.task("db:drop_all", function(done) {
        return app.start(undefined, true).then(function(app){
          return app._orm.getQueryInterface().
            dropAllTables().then(()=>{
              done();
            });
        });
      })
  }

  gulp.task("db:migrate", function(done) {
    var count = -1;
    if (options._.length > 0 ) {
      count = 0-options._[0]
    }
    if ( isNaN(count)) {
      throw "db:migrate [count] has to be a number, or you can leave it out"
    }
    return app.start(undefined, true).then(function(app){
      var umzug = new Umzug({
        storage: 'sequelize',
        storageOptions: {
          sequelize: app._orm
        },
        migrations: {
          path: "db/migrations",
          pattern: /\.js?/,
          wrap: function(fn) {
            return function() {
              return fn(app._orm.getQueryInterface(), Sequelize)
            }
          }
        }
      });
      return umzug.pending().then(function(migrations){
        console.log('pending migrations:', migrations);
        if ( count >= 0 ) {
          migrations = migrations.slice(0, count);
        }
        console.log('migrating migrations:', migrations);

        return umzug.up({
          migrations: migrations.map((m)=>{return m.file;})
        });
      }).catch((e)=>{
        console.log(e.stack);
        throw e;
        done(e);
      })
    })
  })
  gulp.task("db:rollback", function(done) {
    var count = 1;
    if (options._.length < 1 ) {
      count = 0-options._[0]
    }
    if ( isNaN(count)) {
      throw "db:rollback [count] has to be a number, -1 will roll everything back"
    }
    return app.start(undefined, true).then(function(app){
      var umzug = new Umzug({
        storage: 'sequelize',
        storageOptions: {
          sequelize: app._orm
        },
        migrations: {
          path: "db/migrations",
          pattern: /\.js?/,
          wrap: function(fn) {
            return function() {
              return fn(app._orm.getQueryInterface(), Sequelize)
            }
          }
        }
      });
      return umzug.executed().then(function(migrations){
        if ( count >= 0 ) {
          migrations = migrations.slice(migrations.length-(count+1), count);
        }
        return umzug.down(migrations);
      }).then(done)
    })
  })
}
