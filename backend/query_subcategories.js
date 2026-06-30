import mongoose from 'mongoose';

const uri = 'mongodb://loft-database:loftstore2026@ac-fbrnbfl-shard-00-00.cbhbvhu.mongodb.net:27017,ac-fbrnbfl-shard-00-01.cbhbvhu.mongodb.net:27017,ac-fbrnbfl-shard-00-02.cbhbvhu.mongodb.net:27017/Loft?ssl=true&replicaSet=atlas-wadb80-shard-0&authSource=admin';

async function run() {
  await mongoose.connect(uri);
  console.log('Connected');
  
  const subcats = await mongoose.connection.collection('subcategories').find({}).toArray();
  console.log('All subcategories parentCategory types:');
  subcats.forEach(s => {
    console.log(`- Subcategory: "${s.name}", parentCategory: ${s.parentCategory} (type: ${typeof s.parentCategory})`);
  });
  
  const luxurySubcats = subcats.filter(s => String(s.parentCategory) === '6a3fd4318a4f3d5d6be814d1');
  console.log('Luxury subcategories filtered:', luxurySubcats);
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
