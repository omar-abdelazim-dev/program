import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Adjust for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Course from '../models/Course.js';
import Module from '../models/Module.js';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/program_db';

// Renames the legacy `sections` collection (and the `Lesson.section` field) to
// `modules`/`Lesson.module`, exposing the hidden Section-per-course layer as
// real, user-facing Modules. Safe to re-run: every step is a no-op if already done.
async function migrate() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const db = mongoose.connection.db;
    const collectionNames = (await db.listCollections().toArray()).map((c) => c.name);

    // 1. Rename the `sections` collection to `modules`, if not already done.
    if (collectionNames.includes('sections') && !collectionNames.includes('modules')) {
      await db.collection('sections').rename('modules');
      console.log('Renamed collection: sections -> modules');
    } else {
      console.log('Collection rename skipped (already done or nothing to rename).');
    }

    // 2. Rename the `section` field on every lesson to `module`.
    const renameResult = await db.collection('lessons').updateMany(
      { section: { $exists: true } },
      { $rename: { section: 'module' } }
    );
    console.log(`Renamed 'section' -> 'module' on ${renameResult.modifiedCount} lesson(s).`);

    // 3. Defensive net: any lesson that still has no module at all (shouldn't
    // happen given the prior section migration, but don't leave orphans).
    const orphanLessons = await db.collection('lessons').find({ module: { $exists: false } }).toArray();
    if (orphanLessons.length > 0) {
      console.log(`Found ${orphanLessons.length} orphan lesson(s) with no module. Attaching to a default module per course...`);
      const byCourse = new Map();
      for (const lesson of orphanLessons) {
        const key = String(lesson.course);
        if (!byCourse.has(key)) byCourse.set(key, []);
        byCourse.get(key).push(lesson);
      }
      for (const [courseId, lessons] of byCourse) {
        const course = await Course.findById(courseId);
        if (!course) {
          console.log(`  -> Skipping orphan lessons for missing course ${courseId}`);
          continue;
        }
        let defaultModule = await Module.findOne({ course: course._id }).sort({ order: 1 });
        if (!defaultModule) {
          defaultModule = await Module.create({
            course: course._id,
            title: 'Course Content',
            order: 1,
            status: 'published',
          });
        }
        for (const lesson of lessons) {
          await db.collection('lessons').updateOne(
            { _id: lesson._id },
            { $set: { module: defaultModule._id } }
          );
        }
        console.log(`  -> Attached ${lessons.length} lesson(s) to module "${defaultModule.title}" for course ${course.title}`);
      }
    } else {
      console.log('No orphan lessons found.');
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

migrate();
