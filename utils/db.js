const { MongoClient } = require('mongodb');

class DBClient {
  constructor(host = 'localhost', port = 27017, database = 'files_manager') {
    this.host = process.env.DB_HOST || host;
    this.port = process.env.DB_PORT || port;
    this.database = process.env.DB_DATABASE || database;
    const url = `mongodb://${this.host}:${this.port}/${this.database}`;
    this.stat = false;

    MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
      if (!err) {
        this.stat = true;
        this.db = client.db(this.database);
      } else {
        this.stat = false;
      }
    });
  }

  isAlive() {
    return this.stat;
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }

  async findFiles(data) {
    return this.db.collection('files').findOne(data);
  }

  async uploadFiles(data) {
    await this.db.collection('files').insertOne(data);
    return this.db.collection('files').findOne(data);
  }
}

const dbClient = new DBClient();

export default dbClient;
