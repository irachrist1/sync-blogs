import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppService } from "./appService.js";

test("AppService creates, revises, and publishes a post", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sync-blogs-test-"));

  try {
    const service = new AppService(join(dir, "store.json"));
    const testUserId = "test-user-001";
    const post = service.createPost(testUserId, "Test draft");
    const revision = service.saveRevision(post.id, "hello world");
    const published = service.publishPost(post.id, "public", true);

    assert.ok(revision);
    assert.equal(published?.status, "published");
    assert.equal(service.listPosts(testUserId).length, 1);
    assert.equal(service.getPost(post.id)?.latestRevision?.content, "hello world");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
