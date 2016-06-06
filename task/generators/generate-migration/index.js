var generators = require('yeoman-generator');
var _ = require('lodash')
module.exports = generators.Base.extend({
  // The name `constructor` is important here
  constructor: function () {
    // Calling the super constructor is important so our generator is correctly set up
    generators.Base.apply(this, arguments);
    this.argument('migrationName', { type: String, required: true });
  },
  generateMigration: function() {
    if ( !this.migrationName || !this.migrationName.length) { throw "migrationName must be provided";}
    var camel = _.camelCase(this.migrationName);
    var kebab = _.kebabCase(this.migrationName);
    var typeResult = /^create(.*?)Table?/.exec(camel);
    var data = {migrationName: camel,
      createTableName: false
    };
    if (typeResult) {

      data.createTableName = typeResult[1];
      // data.createTableName = typeResult
    }
    this.fs.copyTpl(
      this.templatePath(`${__dirname}/../templates/migration.js`),
      this.destinationPath(`db/migrations/${Date.now()}-${kebab}.js`),
      data
    );
  }
});
