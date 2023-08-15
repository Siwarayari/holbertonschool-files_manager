const { MongoClient } = require('mongodb');

class DBClient {
  constructor(host = 'localhost', port = 27017, database = 'files_manager') {
    this.host = process.env.DB_HOST || host;
    this.port = process.env.DB_PORT || port;
    this.database = process.env.DB_DATABASE || database;
    const url = `mongodb://${this.host}:${this.port}`;
    this.db = false;

    MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
      if (!err) {
        this.db = client.db(this.database);
        this.users = this.db.collection('users');
        this.files = this.db.collection('files');
      } else {
        console.log(err.message);
        this.db = false;
      }
    });
  }

  isAlive() {
    return !!this.db;
  }

  async nbUsers() {
    return this.db.collection('users')
      .countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files')
      .countDocuments();
  }
}

const dbClient = new DBClient();

export default dbClient;
