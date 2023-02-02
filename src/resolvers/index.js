const path = require('path')
const fsPromises = require('fs/promises')
const { fileExists, readJsonFile, deleteFile, getDirectoryFileNames } = require('../utils/fileHandling')
const { GraphQLError, printType } = require('graphql')
const crypto = require('crypto')
const { productTypeEnum, productStatusEnum} = require('../enums/products')
const axios = require('axios').default


const cartDirectory = path.join(__dirname, '..', 'data', 'carts')
const productDirectory = path.join(__dirname, '..', 'data', 'products')

exports.resolvers = {
    Query: {
        getAllCarts: async (_, args) => {

            const carts = await getDirectoryFileNames(cartDirectory)


            const promises = []
           carts.forEach((cart) => {
            const filePath = path.join(cartDirectory, cart)

            promises.push(readJsonFile(filePath))
           });

            return promises
        },

        getCartById: async (_, args) => {

            const cartId = args.cartId

            const filePath = path.join(cartDirectory, `${cartId}.json`)

            const projectExists = await fileExists(filePath)
            if(!projectExists) return new GraphQLError("That cart does not exists!")

            const cartData = await fsPromises.readFile(filePath, {encoding: 'utf-8'})

            const data = JSON.parse(cartData)

            return data
        },

        getAllProducts: async (_, args) => {
            const products = await getDirectoryFileNames(productDirectory)
            const promises = []
            products.forEach((product) => {
             const filePath = path.join(productDirectory, product)
 
             promises.push(readJsonFile(filePath))
            });


            return promises

        },

    },

    Mutation: {
        createCart: async (_, args) => {
			if (args.cartName.length === 0) return new GraphQLError('Name must be at least 1 character long')

            const newCart = {
                cartId: crypto.randomUUID(),
                cartName : args.cartName,
                totalPrice: args.totalPrice || '',
                products: args.products || []
            }

            let filePath = path.join(cartDirectory, `${newCart.cartId}.json`)
            const exists =  await fileExists(filePath)

            if(exists) return new GraphQLError('Cart already exists')

            await fsPromises.writeFile(filePath, JSON.stringify(newCart))
       
            return newCart
        },

        updateCart: async (_, args) => {

            const {cartId, cartName, totalprice, products} = args

            const filePath = path.join(cartDirectory, `${cartId}.json`)

            const cartExists = await fileExists(filePath)

            if (!cartExists) return new GraphQLError('That cart does not exist')

            const updatedCart = {
                cartId,
                cartName,
                totalprice,
                products
            }

            await fsPromises.writeFile(filePath, JSON.stringify(updatedCart))


            return updatedCart
        },

        deleteCart: async (_, args) => {

            const cartId = args.cartId

            const filePath = path.join(cartDirectory, `${cartId}.json`)

            const cartExists = await fileExists(filePath)

            if (!cartExists) return new GraphQLError('That cart does not exist')

            try {
                await deleteFile(filePath)
            } catch (error) {
                return {
                    deletedId: cartId,
					success: false,
                }
            }

            return {
                deletedId: cartId,
                success: true,
            }
        },

        createProduct: async (_, args) => {

            const { 
                productName, 
                productPrice, 
                productType, 
                productStatus } = args.input

                const newProduct = {
                    productId: crypto.randomUUID(),
                    productName : productName,
                    productPrice: productPrice,
                    productType: productType || productTypeEnum.LOW_PRICE,
                    productStatus: productStatus || productStatusEnum.IN_STOCK
                }

                const filePath = path.join(productDirectory, `${newProduct.productId}.json`)
                await fsPromises.writeFile(filePath, JSON.stringify(newProduct))


            return newProduct
        },

        deleteProduct: async (_, args) => {

            const productId = args.productId

            const filePath = path.join(productDirectory, `${productId}.json`)

            const productExists = await fileExists(filePath)

            if(!productExists) return new GraphQLError("This product doesn't exist!")

            try {
                await deleteFile(filePath)
            } catch (error){
                return {
                    deletedId: productId,
                    success: false
                }
            }

            return {
                deletedId: productId,
                success: true,
            }
        },

        addProductToCart: async (_, args) => {
            const { cartId, productId} = args
            let cartFilePath = path.join(cartDirectory, `${cartId}.json`)
            let productFilePath = path.join(productDirectory, `${productId}.json`)

            let readCart = await fsPromises.readFile(cartFilePath, {encoding: 'utf-8'})
            let parsedCart = JSON.parse(readCart)

            let readProduct = await fsPromises.readFile(productFilePath, {encoding: 'utf-8'})
            let parsedProduct = JSON.parse(readProduct)

            parsedCart.products.push(parsedProduct)
    
            await fsPromises.writeFile(cartFilePath, JSON.stringify(parsedCart))
           
            return parsedCart
        }, 

        deleteAllProductsFromCart: async (_, args) => {

            const { cartId} = args
            let cartFilePath = path.join(cartDirectory, `${cartId}.json`)

            let readCart = await fsPromises.readFile(cartFilePath, {encoding: 'utf-8'})
            let parsedCart = JSON.parse(readCart)

            let productsArray = parsedCart.products

            productsArray.splice(0)
            
            await fsPromises.writeFile(cartFilePath, JSON.stringify(parsedCart))
           
            return parsedCart
        }, 

        deleteOneProductFromCart: async (_, args) =>{
            const { cartId, productId} = args
            let cartFilePath = path.join(cartDirectory, `${cartId}.json`)
            let productFilePath = path.join(productDirectory, `${productId}.json`)

            let readCart = await fsPromises.readFile(cartFilePath, {encoding: 'utf-8'})
            let parsedCart = JSON.parse(readCart)

            let readProduct = await fsPromises.readFile(productFilePath, {encoding: 'utf-8'})
            let parsedProduct = JSON.parse(readProduct)

            let productsArray = parsedCart.products
            let pId = parsedProduct.productId

            const removeProductById = (productsArray, pId)=>{
                const findIndex= productsArray.findIndex((productsArray) => productsArray.productId === pId)  
                if(findIndex > -1){
                    productsArray.splice(findIndex, 1)
                }
                console.log(productsArray)
                return productsArray
            }
            removeProductById(productsArray, pId)

            await fsPromises.writeFile(cartFilePath, JSON.stringify(parsedCart))

            return parsedCart
        },
        showTotalprice: async (_, args) =>{
            const { cartId} = args
            let cartFilePath = path.join(cartDirectory, `${cartId}.json`)

            let readCart = await fsPromises.readFile(cartFilePath, {encoding: 'utf-8'})
            console.log("2", readCart )
            let parsedCart = JSON.parse(readCart)
        
            const products = parsedCart.products

            let totalP = 0
            products.forEach((product) =>{
                totalP += product.productPrice
            })

            parsedCart.totalprice = totalP

            await fsPromises.writeFile(cartFilePath, JSON.stringify(parsedCart))

            return parsedCart
        }
    }
}