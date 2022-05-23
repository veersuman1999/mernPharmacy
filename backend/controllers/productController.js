const Product= require("../models/productModel");
const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors= require("../middleware/catchAsyncError");
const ApiFeatures = require("../utils/apifeatures");
const cloudinary= require("cloudinary");

//Create Product--admin
exports.createProduct= catchAsyncErrors(async(req,res,next)=>{

    let images=[];
    if(typeof req.body.images=== "string"){
        images.push(req.body.images);
    }else{
        images=req.body.images;

    } 

    const imagesLinks=[];
    for(let i=0;i<images.length;i++){
        const result= await cloudinary.v2.uploader.upload(images[i],{
            folder:"products",
        });

        imagesLinks.push({
            public_id:result.public_id,
            url:result.secure_url,
        });
    }

    req.body.images= imagesLinks;
    req.body.user= req.user.id;

    const product= await Product.create(req.body);
    res.status(201).json({
        success:true,
        product
    });
});



//get all products
exports.getAllProducts= catchAsyncErrors(async(req,res,next)=>{
    

    const resultPerPage=8;
    const productsCount=await Product.countDocuments();
    const apifeature= new ApiFeatures(Product.find(),req.query).search().filter()
    let products = await apifeature.query;
    let filteredProductsCount= products.length;

    apifeature.pagination(resultPerPage);
    
    
    products= await apifeature.query;
    res.status(200).json({
        success:true,
        products,
        productsCount,
        resultPerPage,
        filteredProductsCount
    });
});

//get all products(Admin)
exports.getAdminProducts= catchAsyncErrors(async(req,res,next)=>{
    
    const products=await Product.find();
    
    res.status(200).json({
        success:true,
        products,
    });
});

//Update Product--Admin
exports.updateProduct= catchAsyncErrors(async(req,res,next)=>{
    let product= await Product.findById(req.params.id);
    if(!product){
        return next(new ErrorHandler("Product not Found",404));
    }

    //images start here
    let images=[];
    if(typeof req.body.images=== "string"){
        images.push(req.body.images);
    }else{
        images=req.body.images;

    }

    if(images!== undefined){
        //Deleting images from clodinary
    for (let i = 0; i < product.images.length; i++) {
        await cloudinary.v2.uploader.destroy(
            product.images[i].public_id
        );
        
    }

    const imagesLinks=[];
    for(let i=0;i<images.length;i++){
        const result= await cloudinary.v2.uploader.upload(images[i],{
            folder:"products",
        });

        imagesLinks.push({
            public_id:result.public_id,
            url:result.secure_url,
        });
    }

    req.body.images= imagesLinks;
    }

    

    product= await Product.findByIdAndUpdate(req.params.id,req.body,{new:true, useFindAndModify:false});

    res.status(200).json({
        success:true,
        product
    });
});

//Delete product
exports.deleteProduct= catchAsyncErrors(async(req,res,next)=>{
    const product= await Product.findById(req.params.id);
    if(!product){
        return next(new ErrorHandler("Product not Found",404));
    }

    //Deleting images from clodinary
    for (let i = 0; i < product.images.length; i++) {
        await cloudinary.v2.uploader.destroy(
            product.images[i].public_id
        );
        
    }

    await product.remove();
        await product.remove();
        res.status(200).json({
            success:true,
            message:"Product Deleted Successfully"
        });
    });

//Get Single Product
exports.getProductDetails= catchAsyncErrors(async(req,res,next)=>{
    const product= await Product.findById(req.params.id);
    if(!product){
        return next(new ErrorHandler("Product not Found",404));
    }

    res.status(200).json({
        success:true,
        product
    });
});
    
//Create new Review or Update the review
exports.createProductReview= catchAsyncErrors(async(req,res,next)=>{

    const {rating,comment,productId}=req.body;
    const review={
        user:req.user._id,
        name:req.user.name,
        rating:Number(rating),
        comment,
    };
    const product= await Product.findById(productId);
    const isReviewed= product.reviews.find((rev)=> rev.user.toString() === req.user._id.toString());

    if(isReviewed){
        product.reviews.forEach(rev=>{
            if(rev.user.toString() === req.user._id.toString())
            (rev.rating=rating), (rev.comment=comment)
        });
    }
    else{
        product.reviews.push(review);
        product.numOfReviews= product.reviews.length
    }

    let avg=0;
    product.ratings= product.reviews.forEach((rev)=>{
        avg+=rev.rating;
    });
    product.ratings=avg/product.reviews.length;

    await product.save({validateBeforeSave: false});

    res.status(200).json({
        success:true
    });
});

//Get All reviews
exports.getProductReviews=catchAsyncErrors(async(req,res,next)=>{
    const product=await Product.findById(req.query.id);

    if(!product){
        return next(new ErrorHandler("Product not found",404));

    }
    res.status(200).json({
        success:true,
        reviews:product.reviews,
    });
});

//Delete Review
exports.deleteReview=catchAsyncErrors(async(req,res,next)=>{
    const product=await Product.findById(req.query.productId);

    if(!product){
        return next(new ErrorHandler("Product not found",404));

    }
    const reviews = product.reviews.filter(rev=> rev._id.toString() !== req.query.id.toString());
    let avg=0;
    reviews.forEach((rev)=>{
        avg+=rev.rating;
    });
    let ratings=0;

    if(reviews.length===0){
        ratings=0;
    }else{
        ratings=avg/reviews.length;
    }
    const numOfReviews=reviews.length;

    await Product.findByIdAndUpdate(req.query.productId,{
        reviews,
        ratings,
        numOfReviews
    },{
        new:true,
        runValidators:true,
        useFindAndModify:false,
    });
    res.status(200).json({
        success:true,
    });
});
