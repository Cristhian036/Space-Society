import numpy as np
from terrain_water import drainage_height, screen


def test_height_uses_downstream_drain_and_preserves_unresolved_outlet():
    z=np.array([[50.,40.,30.,10.,80.]])
    rec=np.array([1,2,3,-1,-1])
    result=drainage_height(z,rec,np.array([4,0,1,2,3]),np.array([False,False,False,True,False]))
    np.testing.assert_allclose(result[0,:4],[40,30,20,0])
    assert np.isnan(result[0,4])


def test_terrain_does_not_create_water_or_bridge_missing_evidence():
    db=np.array([[-24.,-20.,-5.,-19.,-24.]])
    hand=np.zeros_like(db);slope=np.zeros_like(db)
    hand[0,4]=40
    result=screen(db,hand,slope,-18)
    np.testing.assert_array_equal(result,[[True,True,False,False,False]])
    assert not screen(np.full_like(db,-5),hand,slope,-18).any()
