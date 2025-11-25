import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create default user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.upsert({
        where: { email: 'demo@example.com' },
        update: {},
        create: {
            email: 'demo@example.com',
            passwordHash: hashedPassword,
            name: 'Demo User'
        }
    });
    console.log('✅ Created user:', user.email);

    // Seed storage locations
    const locations = [
        { code: 'A1', name: 'Shelf A1', description: 'Top shelf, left side' },
        { code: 'A2', name: 'Shelf A2', description: 'Top shelf, right side' },
        { code: 'B1', name: 'Shelf B1', description: 'Middle shelf, left side' },
        { code: 'B2', name: 'Shelf B2', description: 'Middle shelf, right side' },
        { code: 'C1', name: 'Shelf C1', description: 'Bottom shelf, left side' },
        { code: 'C2', name: 'Shelf C2', description: 'Bottom shelf, right side' },
        { code: 'SHELF-1', name: 'Storage Shelf 1', description: 'Main storage area' },
        { code: 'SHELF-2', name: 'Storage Shelf 2', description: 'Secondary storage' },
        { code: 'WAREHOUSE', name: 'Warehouse', description: 'Off-site warehouse' }
    ];

    for (const loc of locations) {
        await prisma.storageLocation.upsert({
            where: { code: loc.code },
            update: {},
            create: loc
        });
    }
    console.log('✅ Created', locations.length, 'storage locations');

    // Seed conditions
    const conditions = [
        { code: 'new', name: 'New', description: 'Brand new, never used', multiplier: 1.0 },
        { code: 'like_new', name: 'Like New', description: 'Excellent condition, minimal use', multiplier: 0.85 },
        { code: 'good', name: 'Good', description: 'Good condition, normal wear', multiplier: 0.70 },
        { code: 'fair', name: 'Fair', description: 'Fair condition, visible wear', multiplier: 0.50 },
        { code: 'for_parts', name: 'For Parts', description: 'Not working, for parts only', multiplier: 0.30 },
        { code: 'needs_testing', name: 'Needs Testing', description: 'Untested, unknown condition', multiplier: 0.60 },
        { code: 'needs_inspection', name: 'Needs Inspection', description: 'Requires detailed inspection', multiplier: 0.65 }
    ];

    for (const cond of conditions) {
        await prisma.condition.upsert({
            where: { code: cond.code },
            update: {},
            create: cond
        });
    }
    console.log('✅ Created', conditions.length, 'conditions');

    // Seed categories
    const categories = [
        { code: 'electronics', name: 'Electronics', ebayId: '293' },
        { code: 'phones', name: 'Cell Phones & Smartphones', ebayId: '9355' },
        { code: 'computers', name: 'Computers & Tablets', ebayId: '58058' },
        { code: 'cameras', name: 'Cameras & Photo', ebayId: '625' },
        { code: 'video_games', name: 'Video Games & Consoles', ebayId: '1249' },
        { code: 'home_garden', name: 'Home & Garden', ebayId: '11700' },
        { code: 'clothing', name: 'Clothing & Accessories', ebayId: '11450' },
        { code: 'toys', name: 'Toys & Hobbies', ebayId: '220' },
        { code: 'sports', name: 'Sporting Goods', ebayId: '888' },
        { code: 'collectibles', name: 'Collectibles', ebayId: '1' }
    ];

    for (const cat of categories) {
        await prisma.category.upsert({
            where: { code: cat.code },
            update: {},
            create: cat
        });
    }
    console.log('✅ Created', categories.length, 'categories');

    console.log('🎉 Seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
