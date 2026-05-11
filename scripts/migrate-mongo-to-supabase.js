require('dotenv').config({ path: '../backend/.env' });
const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');

// Legacy Mongoose Models
const productSchema = new mongoose.Schema({
  name: String,
  handle: String,
  basePrice: Number,
  salePrice: Number,
  imageUrl: String,
  images: [String],
  description: String,
  sortOrder: Number,
  active: Boolean,
  status: String,
  quantity: Number,
  collectionIds: [{ type: mongoose.Schema.Types.ObjectId }],
  options: [{
    name: String,
    required: Boolean,
    values: [{
      label: String,
      price: Number,
      salePrice: Number
    }]
  }],
  variants: { type: Map, of: Object }
});
const Product = mongoose.model('Product', productSchema, 'products');

const collectionSchema = new mongoose.Schema({
  name: String,
  urlName: String,
  description: String,
  imageUrl: String,
  sortOrder: Number,
  productOrder: [{ type: mongoose.Schema.Types.ObjectId }]
});
const Collection = mongoose.model('Collection', collectionSchema, 'collections');

const orderSchema = new mongoose.Schema({
  orderId: String,
  customer: {
    name: String,
    phone: String,
    secondPhone: String,
    address: String,
    government: String,
    notes: String
  },
  items: [{
    productId: String,
    name: String,
    imageUrl: String,
    basePrice: Number,
    finalPrice: Number,
    quantity: Number,
    discount: Number,
    selectedOptions: [{
      groupName: String,
      label: String,
      price: Number
    }]
  }],
  discount: Number,
  totalPrice: Number,
  shippingFee: Number,
  paymentMethod: String,
  paid: Boolean,
  paidAmount: Number,
  archived: Boolean,
  status: String,
  createdAt: Date,
  updatedAt: Date
});
const Order = mongoose.model('Order', orderSchema, 'orders');

async function runMigration() {
  const mongoUri = process.env.MONGODB_URI;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!mongoUri || !supabaseUrl || !supabaseKey) {
    console.error('Missing credentials. Please check MONGODB_URI, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const idMap = new Map(); // Map Mongo ObjectId (String) -> Supabase UUID

  try {
    // 1. Collections
    console.log('Migrating Collections...');
    const collections = await Collection.find();
    for (const c of collections) {
      const { data, error } = await supabase.from('collections').insert({
        name: c.name,
        url_name: c.urlName || null,
        description: c.description || '',
        image_url: c.imageUrl || '',
        sort_order: c.sortOrder || 0
      }).select().single();
      if (error) throw error;
      idMap.set(c._id.toString(), data.id);
    }
    console.log(`Migrated ${collections.length} collections.`);

    // 2. Products
    console.log('Migrating Products...');
    const products = await Product.find();
    let productCount = 0;
    for (const p of products) {
      const { data, error } = await supabase.from('products').insert({
        name: p.name,
        handle: p.handle || '',
        base_price: p.basePrice || 0,
        sale_price: p.salePrice || null,
        image_url: p.imageUrl || '',
        description: p.description || '',
        sort_order: p.sortOrder || 0,
        active: p.active !== false,
        status: p.status || 'active',
        quantity: p.quantity ?? null
      }).select().single();
      if (error) throw error;
      idMap.set(p._id.toString(), data.id);
      
      const newPid = data.id;

      // Images
      if (p.images && p.images.length > 0) {
        await supabase.from('product_images').insert(
          p.images.map((url, i) => ({ product_id: newPid, url, position: i }))
        );
      }

      // Product Collections
      if (p.collectionIds && p.collectionIds.length > 0) {
        for (const cid of p.collectionIds) {
          const mappedCid = idMap.get(cid.toString());
          if (mappedCid) {
            await supabase.from('product_collections').insert({
              product_id: newPid,
              collection_id: mappedCid
            });
          }
        }
      }

      // Options
      if (p.options && p.options.length > 0) {
        for (let i = 0; i < p.options.length; i++) {
          const opt = p.options[i];
          const { data: optData } = await supabase.from('product_options').insert({
            product_id: newPid,
            name: opt.name,
            required: opt.required || false,
            position: i
          }).select().single();

          if (optData && opt.values && opt.values.length > 0) {
            await supabase.from('option_values').insert(
              opt.values.map((v, j) => ({
                option_id: optData.id,
                label: v.label,
                price: v.price || 0,
                sale_price: v.salePrice || null,
                position: j
              }))
            );
          }
        }
      }
      productCount++;
    }
    console.log(`Migrated ${productCount} products.`);

    // 3. Orders
    console.log('Migrating Orders...');
    const orders = await Order.find();
    let orderCount = 0;
    for (const o of orders) {
      const { data: oData, error } = await supabase.from('orders').insert({
        order_id: o.orderId,
        customer_name: o.customer.name,
        customer_phone: o.customer.phone,
        customer_second_phone: o.customer.secondPhone || '',
        customer_address: o.customer.address,
        customer_government: o.customer.government,
        customer_notes: o.customer.notes || '',
        discount: o.discount || 0,
        total_price: o.totalPrice || 0,
        shipping_fee: o.shippingFee || 0,
        payment_method: o.paymentMethod || 'cash',
        paid: o.paid || false,
        paid_amount: o.paidAmount || 0,
        archived: o.archived || false,
        status: o.status || 'pending',
        created_at: o.createdAt || new Date(),
        updated_at: o.updatedAt || new Date()
      }).select().single();
      if (error) {
        console.error(`Failed to migrate order ${o.orderId}:`, error.message);
        continue;
      }
      const newOid = oData.id;

      if (o.items && o.items.length > 0) {
        for (const item of o.items) {
          const mappedPid = idMap.get(item.productId) || item.productId;
          const { data: itemData } = await supabase.from('order_items').insert({
            order_id: newOid,
            product_id: mappedPid,
            name: item.name,
            image_url: item.imageUrl || '',
            base_price: item.basePrice || 0,
            final_price: item.finalPrice || 0,
            quantity: item.quantity || 1,
            discount: item.discount || 0
          }).select().single();

          if (itemData && item.selectedOptions && item.selectedOptions.length > 0) {
            await supabase.from('order_item_options').insert(
              item.selectedOptions.map(so => ({
                order_item_id: itemData.id,
                group_name: so.groupName,
                label: so.label,
                price: so.price || 0
              }))
            );
          }
        }
      }
      orderCount++;
    }
    console.log(`Migrated ${orderCount} orders.`);
    
    console.log('Migration completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

runMigration();
