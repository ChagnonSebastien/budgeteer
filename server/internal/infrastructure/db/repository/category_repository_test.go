package repository

import (
	"errors"
	"testing"

	"chagnon.dev/budget-server/internal/domain/model"
)

func TestCategoryParentMustBelongToTheCaller(t *testing.T) {
	victim := newImportFixture(t)
	attacker := newImportFixture(t)

	_, err := attacker.r.CreateCategory(attacker.ctx, attacker.userID, unique("child"), "", "", "", victim.category, false, 0)
	if !errors.Is(err, ErrForeignReference) {
		t.Fatalf("creating under another user's category: expected ErrForeignReference, got %v", err)
	}

	child, err := attacker.r.CreateCategory(attacker.ctx, attacker.userID, unique("child"), "", "", "", attacker.category, false, 0)
	if err != nil {
		t.Fatal(err)
	}
	foreignParent := victim.category
	err = attacker.r.UpdateCategory(attacker.ctx, attacker.userID, child, UpdateCategoryFields{ParentId: &foreignParent})
	if !errors.Is(err, ErrForeignReference) {
		t.Fatalf("moving under another user's category: expected ErrForeignReference, got %v", err)
	}

	ownParent := attacker.category
	if err := attacker.r.UpdateCategory(attacker.ctx, attacker.userID, child, UpdateCategoryFields{ParentId: &ownParent}); err != nil {
		t.Fatalf("moving under an own category: %v", err)
	}
	if err := victim.r.UpdateCategory(victim.ctx, victim.userID, model.CategoryID(victim.category), UpdateCategoryFields{}); err != nil {
		t.Fatalf("victim updating its own category: %v", err)
	}
}

func TestCategoryCannotMoveUnderItsOwnDescendant(t *testing.T) {
	f := newImportFixture(t)

	parent, err := f.r.CreateCategory(f.ctx, f.userID, unique("parent"), "", "", "", f.category, false, 0)
	if err != nil {
		t.Fatal(err)
	}
	child, err := f.r.CreateCategory(f.ctx, f.userID, unique("child"), "", "", "", int(parent), false, 0)
	if err != nil {
		t.Fatal(err)
	}

	for _, newParent := range []int{int(child), int(parent)} {
		err = f.r.UpdateCategory(f.ctx, f.userID, parent, UpdateCategoryFields{ParentId: &newParent})
		if !errors.Is(err, ErrForeignReference) {
			t.Fatalf("moving under %d: expected ErrForeignReference, got %v", newParent, err)
		}
	}
}
