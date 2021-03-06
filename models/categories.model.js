const mongoose = require('mongoose');

const catSchema = new mongoose.Schema({
  CatParent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "categories"
  },  //For subcats
  CatName: { type: String, required: true }
});

const Category = mongoose.model('categories', catSchema);

module.exports = {
  collectionName: Category.collection.name,
  all: async function() {
    return await Category.aggregate([
      {
        $match:{
          CatParent: null
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "CatParent",
          as: 'SubCats'
        }
      },
      {
        $project: {
          'CatID': '$_id',
          'CatName': '$CatName',
          'SubCats': {
            '$map': {
              'input': '$SubCats',
              'in': {
                'CatID': '$$this._id',
                'CatName': '$$this.CatName'
              }
            }
          }
        }
      }
    ]);
  },
  singleCategory: async function(catID) {
    return await Category.find({
      _id: mongoose.Types.ObjectId(catID)
    });
  },
  singleMainCategory: async function(catID) {
    return await Category.aggregate([
      {
        $match:{
          CatParent: null,
          _id: mongoose.Types.ObjectId(catID)
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "CatParent",
          as: 'SubCats'
        }
      },
      {
        $project: {
          'CatID': '$_id',
          'CatName': '$CatName',
          'SubCats': {
            '$map': {
              'input': '$SubCats',
              'in': {
                'CatID': '$$this._id',
                'CatName': '$$this.CatName'
              }
            }
          }
        }
      }
    ]);
  },
  subcatsOfCategory: async function(catID) {
    return await Category.find({
      CatParent: mongoose.Types.ObjectId(catID)
    });
  },

  add: async function(entity) {
    return await new Category({
      CatParent: entity.CatParent,
      CatName: entity.CatName
    }).save((err)=>{
      if (err) {
        console.log(err);
      }
    });
  },
  del: async function(entity) {
    const condition = entity.CatID;

    //Block delete those which have reference to it
    const numSubcats = await Category.countDocuments({
      CatParent: condition
    });
    if (numSubcats !== 0) {
      console.log('Attempted to delete cat that have ref to it')
      return false;
    }
    //Block category which has courses
    const dontHaveCourse = await Category.aggregate([
      { '$lookup': {
          'from': 'courses', 
          'localField': '_id', 
          'foreignField': 'Category', 
          'as': 'Courses'
        }
      }, 
      { '$match': {
          _id: mongoose.Types.ObjectId(condition),
          'Courses._id': {
            '$exists': false
          }
        }
      }
    ]);
    if (dontHaveCourse.length < 1) {
      //Have courses in this category
      return false;
    }

    const result = await Category.deleteOne({
      '_id': condition,
    }, function(err){
      if (err) {
        console.log(err);
      }
    });

    return (result.ok==1);
  },
  patch: async function(entity) {
    const condition = entity.CatID;
    return await Category.updateOne({'_id': condition}, {'CatName': entity.CatName}, function(err){
      if (err) {
        console.log(err);
      }
    });
  }
}