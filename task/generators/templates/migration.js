"use strict";

var <%= migrationName %> = module.exports = {
  up: function(queryInterface, Sequelize) {
    <% if (createTableName) { %>
      return queryInterface.createTable(
        '<%=createTableName%>',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          createdAt: {
            type: Sequelize.DATE
          },
          updatedAt: {
            type: Sequelize.DATE
          }
        }
      )
    <% } else { %>
    return new Promise((res, rej) => {
      rej("up not implemented yet")
    })
    <% } %>
  },

  down: function(queryInterface, Sequelize) {
    <% if (createTableName) { %>
      return queryInterface.dropTable('<%=createTableName%>')
    <% } else { %>
    return new Promise((res, rej) => {
      rej("down not implemented yet")
    })
    <% } %>
  }
};
