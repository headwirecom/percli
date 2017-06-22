package {{ package }};

import com.peregrine.nodetypes.models.AbstractComponent;
import com.peregrine.nodetypes.models.IComponent;
import com.peregrine.nodetypes.models.Container;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.models.annotations.Default;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Exporter;
import org.apache.sling.models.annotations.Model;

import javax.inject.Inject;
import javax.inject.Named;

/*
    //GEN[:DATA
    //GEN]
*/

//GEN[:DEF
@Model(
        adaptables = Resource.class,
        resourceType = "{{ componentPath }}",
        defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL,
        adapters = IComponent.class
)
@Exporter(
        name = "jackson",
        extensions = "json"
)
//GEN]
public class {{ modelName }}Model extends {{ classNameParent }} {

    public {{ modelName }}Model(Resource r) { super(r); }

    //GEN[:INJECT
    //GEN]

    //GEN[:GETTERS
    //GEN]

}
